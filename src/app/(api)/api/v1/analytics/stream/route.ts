import { sseManager } from '@/lib/sse-manager'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'

const db = admin.database()

type AuthorConfigs = {
	user: {
		name: string | null
		avatar: string | null
		tag: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: any[]
	statusConfigs: any[]
}

const REDIS_TTL = 60

async function resolveUserByHandle(username: string, tag: string) {
	if (!username || !tag) return null

	const cacheKey = `cache:handle:${username.toLowerCase()}#${tag}`
	const cached = await redis.get<string>(cacheKey)

	if (cached) {
		try {
			return typeof cached === 'object' ? cached : JSON.parse(cached)
		} catch {
			return null
		}
	}

	const usersSnap = await db.ref('users').get()
	if (!usersSnap.exists()) return null

	const users = usersSnap.val() as Record<string, any>

	const entry = Object.entries(users).find(
		([, u]) =>
			u.name === username && String(u.tag ?? '').padStart(4, '0') === String(tag).padStart(4, '0')
	)

	if (!entry) return null

	const [authorId, userRaw] = entry
	const result = { authorId, userRaw }

	await redis.set(cacheKey, JSON.stringify(result), { ex: REDIS_TTL })
	return result
}

async function loadAuthorConfigsById(authorId: string): Promise<AuthorConfigs | null> {
	const redisKey = `cache:user:${authorId}`
	const cachedUserJson = await redis.get<string>(redisKey)
	let userRaw: any = null

	if (cachedUserJson) {
		try {
			userRaw = typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
		} catch {
			userRaw = null
		}
	}

	if (!userRaw) {
		const userSnap = await db.ref(`users/${authorId}`).get()
		if (!userSnap.exists()) return null
		userRaw = userSnap.val() as any

		const cleanUser = {
			name: userRaw.name ?? null,
			avatar: userRaw.avatar ?? userRaw.image ?? null,
			provider: userRaw.provider ?? null,
			tag: userRaw.tag ?? null,
			createdAt: userRaw.createdAt ?? null,
			lastSeen: userRaw.lastSeen ?? null,
			configs: userRaw.configs ?? null,
		}
		await redis.set(redisKey, JSON.stringify(cleanUser), { ex: REDIS_TTL })
	}

	const presenceMap = userRaw.configs?.presence || {}
	const statusMap = userRaw.configs?.status || {}

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const [presenceSnaps, statusSnaps] = await Promise.all([
		Promise.all(presenceIds.map((id: string) => db.ref(`presence-configs/${id}`).get())),
		Promise.all(statusIds.map((id: string) => db.ref(`status-configs/${id}`).get())),
	])

	const avatarFromUser = userRaw.avatar || userRaw.image || '/logo.png'
	const tagFromUser = String(userRaw.tag ?? '').padStart(4, '0')

	const presenceConfigs = presenceSnaps
		.map((snap, idx) => {
			if (!snap.exists()) return null
			const id = presenceIds[idx]
			const raw = snap.val() as any

			const averageColors: string[] =
				Array.isArray(raw.averageColors) && raw.averageColors.length > 0
					? raw.averageColors
					: raw.averageColor
						? [raw.averageColor]
						: ['#5b5b5b']

			return {
				id,
				title: raw.title || 'Unnamed',
				author: userRaw.name || 'Unknown User',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
				description: raw.description || '',
				averageColors,
				configData: raw.configData || {
					cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
					imageCycles: [],
					buttonPairs: [],
				},
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((cfg): cfg is NonNullable<typeof cfg> => cfg !== null)

	const statusConfigs = statusSnaps
		.map((snap, idx) => {
			if (!snap.exists()) return null
			const id = statusIds[idx]
			const raw = snap.val() as any
			return {
				id,
				title: raw.title || 'Unnamed',
				author: userRaw.name || 'Unknown User',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((st): st is NonNullable<typeof st> => st !== null)

	return {
		user: {
			name: userRaw.name || null,
			avatar: avatarFromUser,
			tag: tagFromUser,
			provider: userRaw.provider || null,
			createdAt: userRaw.createdAt || null,
			lastSeen: userRaw.lastSeen || null,
		},
		presenceConfigs,
		statusConfigs,
	}
}

export async function GET(req: Request) {
	const url = new URL(req.url)
	const username = url.searchParams.get('username') || ''
	const tag = url.searchParams.get('tag') || ''

	if (!username || !tag) {
		return new Response('BadRequest', { status: 400 })
	}

	const encoder = new TextEncoder()
	let closed = false
	const streamId = randomUUID()
	let authorId: any | null = null

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			const resolved = await resolveUserByHandle(username, tag)
			if (!resolved || !resolved.authorId) {
				send('not-found', { username, tag })
				try {
					controller.close()
				} catch {}
				closed = true
				return
			}

			authorId = resolved.authorId

			const initial = await loadAuthorConfigsById(authorId)
			if (!initial || !initial.user) {
				send('not-found', { username, tag })
				try {
					controller.close()
				} catch {}
				closed = true
				return
			}

			send('ready', initial)

			sseManager.addAuthorSub({
				id: streamId,
				authorId,
				send,
				close: () => {
					if (closed) return
					closed = true
					sseManager.removeAuthorSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				sseManager.removeAuthorSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return
			closed = true
			sseManager.removeAuthorSub(streamId)
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
