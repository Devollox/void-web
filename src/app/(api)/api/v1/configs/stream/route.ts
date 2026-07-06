import { auth } from '@/lib/auth'
import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { Config as BaseConfig, Status as BaseStatus, ConfigKind } from '../route'

const db = admin.database()

type QueryKind = ConfigKind
type Config = BaseConfig & { isOwn?: boolean }
type Status = BaseStatus & { isOwn?: boolean }

const globalUsersCache: Record<string, { data: any; updatedAt: number }> = {}
const CACHE_TTL = 30000

async function loadAllByKind(kind: QueryKind, currentUserId?: string | null) {
	const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'
	const configsSnap = await db.ref(targetRef).get()

	if (!configsSnap.exists()) return []

	const configsData = configsSnap.val() as Record<string, any>
	const configEntries = Object.entries(configsData)

	const now = Date.now()
	const missingUserIds = new Set<string>()

	for (const [, raw] of configEntries) {
		if (raw?.authorId) {
			const uid = String(raw.authorId)
			if (!globalUsersCache[uid] || now - globalUsersCache[uid].updatedAt > CACHE_TTL) {
				missingUserIds.add(uid)
			}
		}
	}

	if (missingUserIds.size > 0) {
		if (missingUserIds.size > 5) {
			const allUsersSnap = await db.ref('users').get()
			if (allUsersSnap.exists()) {
				const allUsers = allUsersSnap.val() as Record<string, any>
				for (const uid of missingUserIds) {
					if (allUsers[uid]) {
						globalUsersCache[uid] = { data: allUsers[uid], updatedAt: now }
					}
				}
			}
		} else {
			await Promise.all(
				Array.from(missingUserIds).map(async uid => {
					const userSnap = await db.ref(`users/${uid}`).get()
					if (userSnap.exists()) {
						globalUsersCache[uid] = { data: userSnap.val(), updatedAt: now }
					}
				})
			)
		}
	}

	const isPresence = kind === 'presence'
	const list = configEntries.map(([id, raw]) => {
		const r = raw as any
		const ownerId = r.authorId ? String(r.authorId) : null
		const user = ownerId ? globalUsersCache[ownerId]?.data : null

		const avatar = user?.avatar || user?.image || r?.authorAvatar || '/logo.png'
		const name = user?.name || r?.author || 'Unknown User'
		const tag =
			typeof user?.tag !== 'undefined'
				? String(user.tag).padStart(4, '0')
				: r?.authorTag || undefined

		let item: Config | Status
		if (isPresence) {
			item = mapRawToConfig(id, r, avatar, name) as Config
		} else {
			item = mapRawToStatus(id, r, avatar, name) as Status
		}

		item.authorTag = tag
		if (currentUserId && ownerId && currentUserId === ownerId) {
			item.isOwn = true
		}

		return item
	})

	return list
}

export async function GET(req: Request) {
	const kind = new URL(req.url).searchParams.get('kind') as QueryKind | null

	if (kind !== 'presence' && kind !== 'status') {
		return NextResponse.json(
			{ error: 'InvalidKind', message: 'kind query param is required' },
			{ status: 400 }
		)
	}

	const session = await auth()
	const currentUserId = session?.user?.id ? String(session.user.id) : null

	const encoder = new TextEncoder()
	let closed = false

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			const initial = await loadAllByKind(kind, currentUserId)
			send('ready', initial)

			const refPath = kind === 'presence' ? 'presence-configs' : 'status-configs'
			const ref = db.ref(refPath)

			const onValueHandler = async () => {
				if (closed) return
				const next = await loadAllByKind(kind, currentUserId)
				send('update', next)
			}

			ref.on('value', onValueHandler)

			const ping = setInterval(() => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
				} catch {}
			}, 25000)

			const cleanup = () => {
				if (closed) return
				closed = true
				clearInterval(ping)
				ref.off('value', onValueHandler)
				try {
					controller.close()
				} catch {}
			}

			req.signal.addEventListener('abort', cleanup)
		},
		cancel() {
			closed = true
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'Content-Encoding': 'none',
			'X-Accel-Buffering': 'no',
		},
	})
}
