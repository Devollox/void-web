import { safePublish } from '@/lib/redis-pubsub'
import { sseManager } from '@/lib/sse-manager'
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

async function incrementDownloadsPresence(
	configId: string
): Promise<{ authorId: string | null; downloads: number }> {
	const snap = await db.ref(`presence-configs/${configId}`).get()
	let authorId: string | null = null
	if (snap.exists()) {
		const val = snap.val() as any
		if (val && val.authorId) {
			authorId = String(val.authorId)
		}
	}

	let newDownloads = 0
	const downloadsRef = db.ref(`presence-configs/${configId}/downloads`)
	await downloadsRef.transaction((current: any) => {
		newDownloads = (Number(current) || 0) + 1
		return newDownloads
	})

	return { authorId, downloads: newDownloads }
}

async function incrementDownloadsStatus(
	statusId: string
): Promise<{ authorId: string | null; downloads: number }> {
	const snap = await db.ref(`status-configs/${statusId}`).get()
	let authorId: string | null = null
	if (snap.exists()) {
		const val = snap.val() as any
		if (val && val.authorId) {
			authorId = String(val.authorId)
		}
	}

	let newDownloads = 0
	const downloadsRef = db.ref(`status-configs/${statusId}/downloads`)
	await downloadsRef.transaction((current: any) => {
		newDownloads = (Number(current) || 0) + 1
		return newDownloads
	})

	return { authorId, downloads: newDownloads }
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
			case 'status_download': {
				const { authorId, downloads } = await incrementDownloadsStatus(body.id)

				await safePublish(
					'events:configs',
					JSON.stringify({
						type: 'downloads_updated',
						kind: 'status',
						authorId: authorId ?? '',
						configId: body.id,
					})
				)

				if (authorId) {
					sseManager.notifyAuthorDownloads(authorId, body.id, 'status', downloads)
				}
				sseManager.notifyConfigListDownloads(body.id, 'status', downloads)
				break
			}

			case 'presence_download': {
				const { authorId, downloads } = await incrementDownloadsPresence(body.id)

				await safePublish(
					'events:configs',
					JSON.stringify({
						type: 'downloads_updated',
						kind: 'presence',
						authorId: authorId ?? '',
						configId: body.id,
					})
				)

				if (authorId) {
					sseManager.notifyAuthorDownloads(authorId, body.id, 'presence', downloads)
				}
				sseManager.notifyConfigListDownloads(body.id, 'presence', downloads)
				break
			}

			default:
				return NextResponse.json({ error: 'Unknown event type', type: body.type }, { status: 400 })
		}

		return NextResponse.json({ ok: true })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
