import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'

type AnalyticsEventType =
	| 'status_download'
	| 'presence_download'
	| 'status_open'
	| 'presence_open'
	| 'plugin_download'

interface AnalyticsPayload {
	type: AnalyticsEventType
	id: string
	client?: string
	meta?: Record<string, unknown>
}

const db = admin.database()

async function incrementDownloadsPresence(configId: string): Promise<{ downloads: number }> {
	let newDownloads = 0
	const downloadsRef = db.ref(`presence-configs/${configId}/downloads`)
	await downloadsRef.transaction((current: any) => {
		newDownloads = (Number(current) || 0) + 1
		return newDownloads
	})
	return { downloads: newDownloads }
}

async function incrementDownloadsStatus(statusId: string): Promise<{ downloads: number }> {
	let newDownloads = 0
	const downloadsRef = db.ref(`status-configs/${statusId}/downloads`)
	await downloadsRef.transaction((current: any) => {
		newDownloads = (Number(current) || 0) + 1
		return newDownloads
	})
	return { downloads: newDownloads }
}

async function incrementDownloadsPlugin(pluginId: string): Promise<{ downloads: number }> {
	let newDownloads = 0
	const downloadsRef = db.ref(`plugin-configs/${pluginId}/downloads`)
	await downloadsRef.transaction((current: any) => {
		newDownloads = (Number(current) || 0) + 1
		return newDownloads
	})
	return { downloads: newDownloads }
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
				const { downloads } = await incrementDownloadsStatus(body.id)

				await db.ref('activity/downloads').set({
					ts: Date.now(),
					kind: 'status_download',
					configId: body.id,
					downloads,
				})

				try {
					await redis.zadd('stats:status-downloads', {
						score: downloads,
						member: body.id,
					})
				} catch {}

				break
			}

			case 'presence_download': {
				const { downloads } = await incrementDownloadsPresence(body.id)

				await db.ref('activity/downloads').set({
					ts: Date.now(),
					kind: 'presence_download',
					configId: body.id,
					downloads,
				})

				try {
					await redis.zadd('stats:presence-downloads', {
						score: downloads,
						member: body.id,
					})
				} catch {}

				break
			}

			case 'plugin_download': {
				const { downloads } = await incrementDownloadsPlugin(body.id)

				await db.ref('activity/downloads').set({
					ts: Date.now(),
					kind: 'plugin_download',
					configId: body.id,
					downloads,
				})

				try {
					await redis.zadd('stats:plugin-downloads', {
						score: downloads,
						member: body.id,
					})
				} catch {}

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
