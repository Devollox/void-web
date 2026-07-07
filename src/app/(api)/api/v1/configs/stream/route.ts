import { sseManager } from '@/lib/sse-manager'
import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import '@api/_bootstrap'
import { auth } from '@api/auth/[...nextauth]/route'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { Config as BaseConfig, Status as BaseStatus, ConfigKind } from '../route'

const db = admin.database()

type QueryKind = ConfigKind
type Config = BaseConfig & { isOwn?: boolean }
type Status = BaseStatus & { isOwn?: boolean }

const USER_CACHE_TTL = 60

async function loadUser(authorId: string) {
	const redisKey = `cache:user:${authorId}`
	const cachedUserJson = await redis.get<string>(redisKey)
	if (cachedUserJson) {
		try {
			return typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
		} catch {}
	}
	const snap = await db.ref(`users/${authorId}`).get()
	if (!snap.exists()) return null
	const raw = snap.val() as any
	const userData = {
		name: raw.name ?? null,
		avatar: raw.avatar ?? null,
		provider: raw.provider ?? null,
		tag: raw.tag ?? null,
		createdAt: raw.createdAt ?? null,
		lastSeen: raw.lastSeen ?? null,
	}
	await redis.set(redisKey, JSON.stringify(userData), { ex: USER_CACHE_TTL })
	return userData
}

async function loadAllByKind(kind: QueryKind, currentUserId?: string | null) {
	const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'
	const configsSnap = await db.ref(targetRef).get()
	if (!configsSnap.exists()) {
		return []
	}
	const configsData = configsSnap.val() as Record<string, any>
	const configEntries = Object.entries(configsData)
	const localUsersMap: Record<string, any> = {}
	const missingUserIds = new Set<string>()

	for (const [, raw] of configEntries) {
		if (raw?.authorId) {
			missingUserIds.add(String(raw.authorId))
		}
	}

	if (missingUserIds.size > 0) {
		const missingIdsArray = Array.from(missingUserIds)
		const redisKeys = missingIdsArray.map(id => `cache:user:${id}`)
		const cachedUsersRaw = await redis.mget<string[]>(redisKeys)
		const idsToFetchFromDb: string[] = []

		cachedUsersRaw.forEach((cachedJson, idx) => {
			const currentId = missingIdsArray[idx]
			if (cachedJson) {
				try {
					localUsersMap[currentId] =
						typeof cachedJson === 'object' ? cachedJson : JSON.parse(cachedJson)
				} catch {
					idsToFetchFromDb.push(currentId)
				}
			} else {
				idsToFetchFromDb.push(currentId)
			}
		})

		if (idsToFetchFromDb.length > 0) {
			if (idsToFetchFromDb.length > 5) {
				const allUsersSnap = await db.ref('users').get()
				if (allUsersSnap.exists()) {
					const allUsers = allUsersSnap.val() as Record<string, any>
					for (const uid of idsToFetchFromDb) {
						if (allUsers[uid]) {
							const userData = {
								name: allUsers[uid].name ?? null,
								avatar: allUsers[uid].avatar ?? null,
								provider: allUsers[uid].provider ?? null,
								tag: allUsers[uid].tag ?? null,
								createdAt: allUsers[uid].createdAt ?? null,
								lastSeen: allUsers[uid].lastSeen ?? null,
							}
							localUsersMap[uid] = userData
							await redis.set(`cache:user:${uid}`, JSON.stringify(userData), {
								ex: USER_CACHE_TTL,
							})
						}
					}
				}
			} else {
				await Promise.all(
					idsToFetchFromDb.map(async uid => {
						const u = await loadUser(uid)
						if (u) localUsersMap[uid] = u
					})
				)
			}
		}
	}

	const isPresence = kind === 'presence'
	const list = configEntries.map(([id, raw]) => {
		const r = raw as any
		const ownerId = r.authorId ? String(r.authorId) : null
		const user = ownerId ? localUsersMap[ownerId] : null
		const avatar = user?.avatar || user?.image || r?.authorAvatar || '/logo.png'
		const name = user?.name || r?.author || 'Unknown User'
		const tag =
			typeof user?.tag !== 'undefined' && user?.tag !== null
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
	const streamId = randomUUID()

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
					controller.enqueue(encoder.encode(payload))
				} catch {}
			}

			const initial = await loadAllByKind(kind, currentUserId)

			send('ready', initial)

			sseManager.addConfigListSub({
				id: streamId,
				kind,
				send,
				close: () => {
					if (closed) return

					closed = true
					sseManager.removeConfigListSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return

				closed = true
				sseManager.removeConfigListSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return

			closed = true
			sseManager.removeConfigListSub(streamId)
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
