import { redisSubscriber } from '@/lib/redis-pubsub'
import { sseManager } from '@/lib/sse-manager'
import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'

const db = admin.database()
const USER_CACHE_TTL = 60

type ConfigKind = 'presence' | 'status'

type ConfigEventPayload =
	| {
			type: 'config_created'
			kind: ConfigKind
			authorId: string
			configId: string
	  }
	| {
			type: 'config_deleted'
			kind: ConfigKind
			authorId: string
			configId: string
	  }
	| {
			type: 'downloads_updated'
			kind: ConfigKind
			authorId: string
			configId: string
	  }

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

async function loadAllByKind(kind: ConfigKind) {
	const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'
	const configsSnap = await db.ref(targetRef).get()

	if (!configsSnap.exists()) return []

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

		if (isPresence) {
			const item = mapRawToConfig(id, r, avatar, name) as any
			item.authorTag = tag
			return item
		} else {
			const item = mapRawToStatus(id, r, avatar, name) as any
			item.authorTag = tag
			return item
		}
	})

	return list
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
	if (payload.type === 'config_created' || payload.type === 'downloads_updated') {
		const listSubs = sseManager.getConfigListSubsByKind(payload.kind)
		if (listSubs.length > 0) {
			const listData = await loadAllByKind(payload.kind)
			for (const sub of listSubs) {
				sub.send('update', listData)
			}
		}

		const detailsSubs = sseManager.getConfigDetailsSubsByConfig(payload.kind, payload.configId)
		if (detailsSubs.length > 0) {
			const snapshot = await loadConfigSnapshot(payload.configId, payload.kind)
			if (snapshot) {
				for (const sub of detailsSubs) {
					sub.send('update', snapshot)
				}
			} else {
				for (const sub of detailsSubs) {
					sub.send('not-found', { id: payload.configId, kind: payload.kind })
					sub.close()
				}
			}
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

	if (payload.type === 'config_deleted') {
		const detailsSubs = sseManager.getConfigDetailsSubsByConfig(payload.kind, payload.configId)
		for (const sub of detailsSubs) {
			sub.send('not-found', { id: payload.configId, kind: payload.kind })
			sub.close()
		}

		const listSubs = sseManager.getConfigListSubsByKind(payload.kind)
		if (listSubs.length > 0) {
			const listData = await loadAllByKind(payload.kind)
			for (const sub of listSubs) {
				sub.send('update', listData)
			}
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

;(async () => {
	await redisSubscriber.connect().catch(() => {})
	await redisSubscriber.subscribe('events:configs', async message => {
		try {
			const payload = JSON.parse(message) as ConfigEventPayload
			await handleEvent(payload)
		} catch {}
	})
})()
