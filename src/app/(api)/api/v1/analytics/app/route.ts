import { sseManager } from '@/lib/sse-manager'
import { mapRawToStats, type Stats } from '@/service/firebase'
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

function normalizeCounterValue(value: unknown): CounterValue {
	const raw = value as Partial<CounterValue> | null
	return {
		count: typeof raw?.count === 'number' ? raw.count : 0,
		lastUpdated: typeof raw?.lastUpdated === 'number' ? raw.lastUpdated : Date.now(),
	}
}

function normalizeStatsSnapshot(raw: any): Stats {
	return mapRawToStats(raw || {})
}

async function incrementStats(path: 'stats/downloads' | 'stats/visitors') {
	const ref = db.ref(path)
	const result = await ref.transaction((current: number) => {
		const now = Date.now()
		const prev = normalizeCounterValue(current)
		return {
			count: prev.count + 1,
			lastUpdated: now,
		}
	})

	const updated = normalizeCounterValue(result.snapshot.val())
	return updated
}

async function readStatsAndBroadcast() {
	const snap = await db.ref('stats').get()
	const stats = normalizeStatsSnapshot(snap.val())
	sseManager.broadcastStats('update', stats)
	return stats
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

		if (body.type === 'app_download') {
			const downloads = await incrementStats('stats/downloads')
			const stats = await readStatsAndBroadcast()
			return NextResponse.json({ ok: true, type: body.type, stats, downloads })
		}

		if (body.type === 'app_visitors') {
			const visitors = await incrementStats('stats/visitors')
			const stats = await readStatsAndBroadcast()
			return NextResponse.json({ ok: true, type: body.type, stats, visitors })
		}

		return NextResponse.json({ error: 'Unknown event type', type: body.type }, { status: 400 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
