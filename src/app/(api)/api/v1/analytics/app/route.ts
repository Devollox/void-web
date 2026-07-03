import { incrementDownloadsStats, incrementVisitorsStats } from '@/service/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

type AppAnalyticsEventType = 'app_download' | 'app_visitors'

interface AppAnalyticsPayload {
	type: AppAnalyticsEventType
	channel: string
	meta?: Record<string, unknown>
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
				return NextResponse.json({ ok: true, type: body.type, stats })
			}
			case 'app_visitors': {
				const stats = await incrementVisitorsStats()
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
