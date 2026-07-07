import { sseManager } from '@/lib/sse-manager'
import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { Redis } from '@upstash/redis'

const db = admin.database()
const USER_CACHE_TTL = 60

type ConfigKind = 'presence' | 'status'

type ConfigEventPayload =
	| { type: 'config_created'; kind: ConfigKind; authorId: string; configId: string }
	| { type: 'config_deleted'; kind: ConfigKind; authorId: string; configId: string }
	| { type: 'downloads_updated'; kind: ConfigKind; authorId: string; configId: string }

const redisSub = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

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

async function loadConfigSnapshot(configId: string, kind: ConfigKind) {
	const refPath =
		kind === 'presence' ? `presence-configs/${configId}` : `status-configs/${configId}`
	const snap = await db.ref(refPath).get()
	if (!snap.exists()) return null

	const data = snap.val() as any
	const authorId = data?.authorId ? String(data.authorId) : null

	let user: any = null
	if (authorId) {
		const redisKey = `cache:user:${authorId}`
		const cachedUserJson = await redis.get<string>(redisKey)

		if (cachedUserJson) {
			try {
				user = typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
			} catch {
				user = null
			}
		}

		if (!user) {
			const userSnap = await db.ref(`users/${authorId}`).get()
			if (userSnap.exists()) {
				const raw = userSnap.val() as any
				user = {
					name: raw.name ?? null,
					avatar: raw.avatar ?? null,
					provider: raw.provider ?? null,
					tag: raw.tag ?? null,
					createdAt: raw.createdAt ?? null,
					lastSeen: raw.lastSeen ?? null,
				}
				await redis.set(redisKey, JSON.stringify(user), { ex: USER_CACHE_TTL })
			}
		}
	}

	const avatar = user?.avatar || user?.image || data?.authorAvatar || '/logo.png'
	const name = user?.name || data?.author || 'Unknown User'
	const tag = user?.tag ? String(user.tag).padStart(4, '0') : data?.authorTag || undefined

	if (kind === 'presence') {
		const cfg = mapRawToConfig(configId, data, avatar, name) as any
		cfg.authorTag = tag
		return cfg
	}

	const st = mapRawToStatus(configId, data, avatar, name) as any
	st.authorTag = tag
	return st
}

async function loadAuthorConfigs(authorId: string) {
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
		await redis.set(redisKey, JSON.stringify(cleanUser), { ex: USER_CACHE_TTL })
	}

	const presenceMap = userRaw?.configs?.presence || {}
	const statusMap = userRaw?.configs?.status || {}

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const [presenceSnaps, statusSnaps] = await Promise.all([
		Promise.all(presenceIds.map((id: string) => db.ref(`presence-configs/${id}`).get())),
		Promise.all(statusIds.map((id: string) => db.ref(`status-configs/${id}`).get())),
	])

	const avatarFromUser = userRaw.avatar || userRaw.image || '/logo.png'
	const tagFromUser = userRaw.tag ? String(userRaw.tag).padStart(4, '0') : undefined

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
				authorId,
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
				authorId,
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
			id: authorId,
			name: userRaw.name || null,
			avatar: avatarFromUser,
			tag: tagFromUser || null,
			provider: userRaw.provider || null,
			createdAt: userRaw.createdAt || null,
			lastSeen: userRaw.lastSeen || null,
		},
		presenceConfigs,
		statusConfigs,
	}
}

async function handleEvent(payload: ConfigEventPayload) {
	if (payload.type === 'config_created') {
		const snapshot = await loadConfigSnapshot(payload.configId, payload.kind)
		if (!snapshot) return

		const listSubs = sseManager.getConfigListSubsByKind(payload.kind)
		for (const sub of listSubs) {
			sub.send('created', snapshot)
		}

		if (payload.authorId) {
			const authorSubs = sseManager.getAuthorSubsByAuthor(payload.authorId)
			if (authorSubs.length > 0) {
				const authorData = await loadAuthorConfigs(payload.authorId)
				if (!authorData) {
					for (const sub of authorSubs) {
						sub.send('not-found', { authorId: payload.authorId })
						sub.close()
					}
				} else {
					for (const sub of authorSubs) {
						sub.send('update', authorData)
					}
				}
			}
		}
	}

	if (payload.type === 'downloads_updated') {
		const snapshot = await loadConfigSnapshot(payload.configId, payload.kind)
		if (!snapshot) return

		const listSubs = sseManager.getConfigListSubsByKind(payload.kind)
		for (const sub of listSubs) {
			sub.send('downloads', {
				id: payload.configId,
				kind: payload.kind,
				downloads: snapshot.downloads,
			})
		}

		const detailsSubs = sseManager.getConfigDetailsSubsByConfig(payload.kind, payload.configId)
		for (const sub of detailsSubs) {
			sub.send('update', snapshot)
		}
	}

	if (payload.type === 'config_deleted') {
		const detailsSubs = sseManager.getConfigDetailsSubsByConfig(payload.kind, payload.configId)
		for (const sub of detailsSubs) {
			sub.send('not-found', { id: payload.configId, kind: payload.kind })
			sub.close()
		}

		const listSubs = sseManager.getConfigListSubsByKind(payload.kind)
		for (const sub of listSubs) {
			sub.send('deleted', {
				id: payload.configId,
				kind: payload.kind,
			})
		}

		if (payload.authorId) {
			const authorSubs = sseManager.getAuthorSubsByAuthor(payload.authorId)
			if (authorSubs.length > 0) {
				const authorData = await loadAuthorConfigs(payload.authorId)
				if (!authorData) {
					for (const sub of authorSubs) {
						sub.send('not-found', { authorId: payload.authorId })
						sub.close()
					}
				} else {
					for (const sub of authorSubs) {
						sub.send('update', authorData)
					}
				}
			}
		}
	}
}

async function listenOnce() {
	try {
		const messages: any = await redisSub.subscribe('events:configs')
		for (const message of messages) {
			try {
				const payload = JSON.parse(message) as ConfigEventPayload
				await handleEvent(payload)
			} catch {}
		}
	} catch {}
}

async function loop() {
	for (;;) {
		await listenOnce()
	}
}

loop().catch(() => {})
