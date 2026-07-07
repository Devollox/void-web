import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'

const db = admin.database()
const REDIS_TTL = 60

export interface UserRaw {
	name?: string | null
	avatar?: string | null
	image?: string | null
	tag?: string | null
	authorTag?: string | null
	provider?: string | null
	createdAt?: number | null
	lastSeen?: number | null
	configs?: {
		presence?: Record<string, boolean>
		status?: Record<string, boolean>
	} | null
}

export type AuthorConfigs = {
	user: {
		id?: string
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

export async function loadUserRaw(authorId: string): Promise<UserRaw | null> {
	const redisKey = `cache:user:${authorId}`
	const cachedUserJson = await redis.get<string>(redisKey)
	let cachedUser: UserRaw | null = null

	if (cachedUserJson) {
		try {
			cachedUser = typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
		} catch {
			cachedUser = null
		}
	}

	const userSnap = await db.ref(`users/${authorId}`).get()
	if (!userSnap.exists()) return cachedUser

	const rawData = userSnap.val() as UserRaw

	const userRaw: UserRaw = {
		name: rawData.name ?? cachedUser?.name ?? null,
		avatar: rawData.avatar ?? rawData.image ?? cachedUser?.avatar ?? null,
		provider: rawData.provider ?? cachedUser?.provider ?? null,
		tag: rawData.tag ?? cachedUser?.tag ?? null,
		createdAt: rawData.createdAt ?? cachedUser?.createdAt ?? null,
		lastSeen: rawData.lastSeen ?? cachedUser?.lastSeen ?? null,
		configs: rawData.configs ?? cachedUser?.configs ?? null,
	}

	await redis.set(redisKey, JSON.stringify(userRaw), { ex: REDIS_TTL })
	return userRaw
}

export async function loadAuthorConfigsById(authorId: string): Promise<AuthorConfigs | null> {
	const userRaw = await loadUserRaw(authorId)
	if (!userRaw) return null

	let presenceMap = userRaw.configs?.presence || {}
	let statusMap = userRaw.configs?.status || {}

	let presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	let statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	if (presenceIds.length === 0) {
		const presenceSnap = await db
			.ref('presence-configs')
			.orderByChild('authorId')
			.equalTo(authorId)
			.get()

		if (presenceSnap.exists()) {
			const presenceData = presenceSnap.val() as Record<string, any>
			presenceIds = Object.keys(presenceData)
			presenceMap = {}
			for (const id of presenceIds) {
				presenceMap[id] = true
			}
		}
	}

	if (statusIds.length === 0) {
		const statusSnap = await db
			.ref('status-configs')
			.orderByChild('authorId')
			.equalTo(authorId)
			.get()

		if (statusSnap.exists()) {
			const statusData = statusSnap.val() as Record<string, any>
			statusIds = Object.keys(statusData)
			statusMap = {}
			for (const id of statusIds) {
				statusMap[id] = true
			}
		}
	}

	const [presenceSnaps, statusSnaps] = await Promise.all([
		Promise.all(presenceIds.map(id => db.ref(`presence-configs/${id}`).get())),
		Promise.all(statusIds.map(id => db.ref(`status-configs/${id}`).get())),
	])

	const avatarFromUser = userRaw.avatar || userRaw.image || '/logo.png'
	const tagFromUser = userRaw.tag || userRaw.authorTag || null
	const authorName = userRaw.name || 'Unknown User'
	const formattedTag = tagFromUser ? String(tagFromUser).padStart(4, '0') : null

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
				author: authorName,
				authorId,
				authorAvatar: avatarFromUser,
				authorTag: formattedTag ?? undefined,
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
				author: authorName,
				authorId,
				authorAvatar: avatarFromUser,
				authorTag: formattedTag ?? undefined,
				downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((st): st is NonNullable<typeof st> => st !== null)

	const syncedPresenceMap: Record<string, boolean> = {}
	for (let i = 0; i < presenceConfigs.length; i++) {
		syncedPresenceMap[presenceConfigs[i].id] = true
	}

	const syncedStatusMap: Record<string, boolean> = {}
	for (let i = 0; i < statusConfigs.length; i++) {
		syncedStatusMap[statusConfigs[i].id] = true
	}

	const redisKey = `cache:user:${authorId}`
	await redis.set(
		redisKey,
		JSON.stringify({
			...userRaw,
			configs: {
				presence: syncedPresenceMap,
				status: syncedStatusMap,
			},
		}),
		{ ex: REDIS_TTL }
	)

	return {
		user: {
			id: authorId,
			name: userRaw.name || null,
			avatar: avatarFromUser,
			tag: formattedTag,
			provider: userRaw.provider || null,
			createdAt: userRaw.createdAt || null,
			lastSeen: userRaw.lastSeen || null,
		},
		presenceConfigs,
		statusConfigs,
	}
}
