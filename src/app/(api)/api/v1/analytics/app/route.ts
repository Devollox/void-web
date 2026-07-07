import { sseManager } from '@/lib/sse-manager'
import { mapRawToStats } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

type AppAnalyticsEventType = 'app_download' | 'app_visitors'

interface AppAnalyticsPayload {
	type: AppAnalyticsEventType
	channel: string
	meta?: Record<string, unknown>
}

const db = admin.database()

type CounterValue = {
	count: number
	lastUpdated: number
}

async function incrementDownloadsStats(): Promise<{ downloads: CounterValue }> {
	const ref = db.ref('stats/downloads')
	const result = await ref.transaction((current: { count: number }) => {
		const now = Date.now()
		const count = current && typeof current.count === 'number' ? current.count + 1 : 1
		return { count, lastUpdated: now }
	})

	const val = (result.snapshot.val() as CounterValue | null) ?? {
		count: 0,
		lastUpdated: Date.now(),
	}

	return { downloads: val }
}

async function incrementVisitorsStats(): Promise<{ visitors: CounterValue }> {
	const ref = db.ref('stats/visitors')
	const result = await ref.transaction((current: { count: number }) => {
		const now = Date.now()
		const count = current && typeof current.count === 'number' ? current.count + 1 : 1
		return { count, lastUpdated: now }
	})

	const val = (result.snapshot.val() as CounterValue | null) ?? {
		count: 0,
		lastUpdated: Date.now(),
	}

	return { visitors: val }
}

async function broadcastStats() {
	const snap = await db.ref('stats').get()
	const stats = mapRawToStats(snap.val() || {})
	sseManager.broadcastStats('update', stats)
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as AppAnalyticsPayload

		if (!body || !body.type || !body.channel) {
			return NextResponse.json(
				{ error: 'Invalid payload', message: 'type and channel are required' },
				{ status: 400 }
			)
		}

		switch (body.type) {
			case 'app_download': {
				const stats = await incrementDownloadsStats()
				await broadcastStats()
				return NextResponse.json({ ok: true, type: body.type, stats })
			}
			case 'app_visitors': {
				const stats = await incrementVisitorsStats()
				await broadcastStats()
				return NextResponse.json({ ok: true, type: body.type, stats })
			}
			default:
				return NextResponse.json({ error: 'Unknown event type', type: body.type }, { status: 400 })
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
