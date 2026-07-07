import { safePublish } from '@/lib/redis-pubsub'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

type AnalyticsEventType = 'status_download' | 'presence_download' | 'status_open' | 'presence_open'

interface AnalyticsPayload {
	type: AnalyticsEventType
	id: string
	client?: string
	meta?: Record<string, unknown>
}

const db = admin.database()

async function incrementDownloadsConfigs(configId: string): Promise<void> {
	const downloadsRef = db.ref(`presence-configs/${configId}/downloads`)
	await downloadsRef.transaction((current: any) => (Number(current) || 0) + 1)
}

async function incrementDownloadsStatuses(statusId: string): Promise<void> {
	const downloadsRef = db.ref(`status-configs/${statusId}/downloads`)
	await downloadsRef.transaction((current: any) => (Number(current) || 0) + 1)
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as AnalyticsPayload

		if (!body || !body.type || !body.id) {
			return NextResponse.json(
				{ error: 'Invalid payload', message: 'type and id are required' },
				{ status: 400 }
			)
		}

		switch (body.type) {
			case 'status_download':
				await incrementDownloadsStatuses(body.id)
				await safePublish(
					'events:configs',
					JSON.stringify({
						type: 'downloads_updated',
						kind: 'status',
						authorId: '',
						configId: body.id,
					})
				)
				break
			case 'presence_download':
				await incrementDownloadsConfigs(body.id)
				await safePublish(
					'events:configs',
					JSON.stringify({
						type: 'downloads_updated',
						kind: 'presence',
						authorId: '',
						configId: body.id,
					})
				)
				break
			default:
				return NextResponse.json({ error: 'Unknown event type', type: body.type }, { status: 400 })
		}

		return NextResponse.json({ ok: true })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
