import { admin } from '@/services/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

const db = admin.database()

type AppAnalyticsEventType = 'app_download' | 'app_visitors'

interface AppAnalyticsPayload {
	type: AppAnalyticsEventType
	channel: string
	meta?: Record<string, unknown>
}

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

async function incrementStats(path: 'stats/downloads' | 'stats/visitors') {
	const ref = db.ref(path)
	const result = await ref.transaction((current: unknown) => {
		const now = Date.now()
		const prev = normalizeCounterValue(current)
		return {
			count: prev.count + 1,
			lastUpdated: now,
		}
	})

	return normalizeCounterValue(result.snapshot.val())
}

const allowedOrigin = process.env.NEXTAUTH_URL

function isAllowedRequest(req: NextRequest) {
	const origin = req.headers.get('origin') || ''
	const host = req.headers.get('host') || ''

	if (allowedOrigin && origin === allowedOrigin) {
		return true
	}

	if (allowedOrigin && host && allowedOrigin.includes(host)) {
		return true
	}

	return false
}

export async function POST(req: NextRequest) {
	try {
		if (!isAllowedRequest(req)) {
			return NextResponse.json(
				{ error: 'Forbidden', message: 'Origin not allowed' },
				{ status: 403 }
			)
		}

		const body = (await req.json()) as AppAnalyticsPayload

		if (!body || !body.type || !body.channel) {
			return NextResponse.json(
				{ error: 'Invalid payload', message: 'type and channel are required' },
				{ status: 400 }
			)
		}

		const path = body.type === 'app_download' ? 'stats/downloads' : 'stats/visitors'
		const updated = await incrementStats(path)

		return NextResponse.json({ ok: true, type: body.type, updated })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
