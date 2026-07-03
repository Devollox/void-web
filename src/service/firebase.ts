import { getApps, initializeApp } from 'firebase/app'
import { get, getDatabase, onValue, ref, remove, runTransaction } from 'firebase/database'

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
	databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL as string,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string,
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getDatabase(app, firebaseConfig.databaseURL)

export interface ButtonPair {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

export interface ConfigData {
	cycles: Array<{ details: string; state: string }>
	imageCycles: Array<{
		largeImage: string
		largeText?: string
		smallImage?: string
		smallText?: string
	}>
	buttonPairs: ButtonPair[]
}

export interface UserRecord {
	name?: string
	createdAt?: number
	avatar?: string
	image?: string
	provider?: string | null
	lastSeen?: number
}

export interface Config {
	id: string
	title: string
	author: string
	authorId: string
	authorAvatar?: string
	downloads: number
	description: string
	configData: ConfigData
	averageColor: string
}

export interface Status {
	id: string
	title: string
	author: string
	authorId: string
	authorTag: string
	authorAvatar?: string
	downloads: number
	description: string
	configData: {
		statusCycles: Array<{ text: string }>
	}
}

export interface UserRecordWithId extends UserRecord {
	id: string
}

export interface AuthorConfigsResponse {
	user: {
		id: string
		name: string | null
		avatar: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: Config[]
	statusConfigs: Status[]
}

function mapRawToConfig(
	id: string,
	data: any,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Config {
	return {
		id,
		title: data?.title || 'Unnamed',
		author: overriddenAuthor || data?.author || 'Unknown',
		authorId: data?.authorId ?? null,
		authorAvatar: overriddenAvatar || data?.authorAvatar || '',
		downloads:
			typeof data?.downloads === 'number'
				? data.downloads
				: parseInt(String(data?.downloads ?? '0')) || 0,
		description: data?.description || '',
		averageColor: data?.averageColor || '#5b5b5b',
		configData: data?.configData || {
			cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
			imageCycles: [],
			buttonPairs: [],
		},
	}
}

function mapRawToStatus(
	id: string,
	data: any,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Status {
	return {
		id,
		title: data?.title || 'Unnamed',
		author: overriddenAuthor || data?.author || 'Unknown',
		authorId: data?.authorId ?? null,
		authorAvatar: overriddenAvatar || data?.authorAvatar || '',
		downloads:
			typeof data?.downloads === 'number'
				? data.downloads
				: parseInt(String(data?.downloads ?? '0')) || 0,
		description: data?.description || '',
		configData: data?.configData || { statusCycles: [] },
	}
}

export async function fetchAuthor(authorId: string): Promise<UserRecord | null> {
	const userRef = ref(db, `users/${authorId}`)
	const snapshot = await get(userRef)
	if (!snapshot.exists()) return null
	return snapshot.val() as UserRecord
}

export function onConfigsChange(
	callback: (configs: Config[]) => void,
	refPath?: string,
	authorId?: string
) {
	const path = refPath || 'presence-configs'
	const configsRef = ref(db, path)
	const usersCache: Record<string, UserRecord> = {}
	const pendingUsers: Record<string, Promise<UserRecord | null>> = {}
	let alive = true
	let requestId = 0

	const loadUser = (id: string) => {
		if (usersCache[id]) return Promise.resolve(usersCache[id])
		if (!pendingUsers[id]) {
			pendingUsers[id] = fetchAuthor(id)
				.then(user => {
					if (user) usersCache[id] = user
					return user
				})
				.catch(() => null)
				.finally(() => {
					delete pendingUsers[id]
				})
		}
		return pendingUsers[id]
	}

	const handler = (snapshot: any) => {
		const currentRequest = ++requestId
		const data = snapshot.val()
		if (!data) {
			callback([])
			return
		}

		const allConfigs: Config[] = Object.entries(data).map(([id, raw]) => mapRawToConfig(id, raw))
		const filtered = authorId
			? allConfigs.filter(cfg => String(cfg.authorId) === String(authorId))
			: allConfigs
		const ids = [...new Set(filtered.map(c => c.authorId).filter((id): id is string => !!id))]
		if (ids.length === 0) {
			const configsWithUsers = filtered.map(cfg => cfg)
			callback(configsWithUsers)
			return
		}
		Promise.all(ids.map(loadUser)).then(() => {
			if (!alive || currentRequest !== requestId) return
			const configsWithUsers = filtered.map(config => {
				const user = config.authorId ? usersCache[config.authorId] : null
				if (!user) return config
				return mapRawToConfig(
					config.id,
					config,
					user.avatar || user.image || '',
					user.name || config.author
				)
			})
			callback(configsWithUsers)
		})
	}

	const unsubscribe = onValue(configsRef, handler)

	return () => {
		alive = false
		unsubscribe()
	}
}

export function onStatusesChange(
	callback: (statuses: Status[]) => void,
	refPath?: string,
	authorId?: string
) {
	const path = refPath || 'status-configs'
	const statusesRef = ref(db, path)
	const usersCache: Record<string, UserRecord> = {}
	const pendingUsers: Record<string, Promise<UserRecord | null>> = {}
	let alive = true
	let requestId = 0

	const loadUser = (id: string) => {
		if (usersCache[id]) return Promise.resolve(usersCache[id])
		if (!pendingUsers[id]) {
			pendingUsers[id] = fetchAuthor(id)
				.then(user => {
					if (user) usersCache[id] = user
					return user
				})
				.catch(() => null)
				.finally(() => {
					delete pendingUsers[id]
				})
		}
		return pendingUsers[id]
	}

	const handler = (snapshot: any) => {
		const currentRequest = ++requestId
		const data = snapshot.val()
		if (!data) {
			callback([])
			return
		}
		const allStatuses: Status[] = Object.entries(data).map(([id, raw]) => mapRawToStatus(id, raw))
		const filtered = authorId
			? allStatuses.filter(status => String(status.authorId) === String(authorId))
			: allStatuses
		const ids = [...new Set(filtered.map(s => s.authorId).filter((id): id is string => !!id))]
		if (ids.length === 0) {
			callback(filtered)
			return
		}
		Promise.all(ids.map(loadUser)).then(() => {
			if (!alive || currentRequest !== requestId) return
			const statusesWithUsers = filtered.map(status => {
				const user = status.authorId ? usersCache[status.authorId] : null
				if (!user) return status
				return mapRawToStatus(
					status.id,
					status,
					user.avatar || user.image || '',
					user.name || status.author
				)
			})
			callback(statusesWithUsers)
		})
	}

	const unsubscribe = onValue(statusesRef, handler)

	return () => {
		alive = false
		unsubscribe()
	}
}

export async function incrementDownloadsConfigs(configId: string): Promise<void> {
	const downloadsRef = ref(db, `presence-configs/${configId}/downloads`)
	await runTransaction(downloadsRef, current => (Number(current) || 0) + 1)
}

export async function incrementDownloadsStatuses(configId: string): Promise<void> {
	const downloadsRef = ref(db, `status-configs/${configId}/downloads`)
	await runTransaction(downloadsRef, current => (Number(current) || 0) + 1)
}

export interface Stats {
	visitors: { count: number; lastUpdated: number }
	downloads: { count: number; lastUpdated: number }
}

export function onStatsChange(callback: (stats: Stats) => void) {
	const statsRef = ref(db, 'stats')
	const unsubscribe = onValue(statsRef, snapshot => {
		const data = snapshot.val() || {}
		callback({
			visitors: data.visitors || { count: 0, lastUpdated: Date.now() },
			downloads: data.downloads || { count: 0, lastUpdated: Date.now() },
		})
	})
	return unsubscribe
}

export function onConfigByIdChange(id: string, callback: (config: Config | null) => void) {
	const configRef = ref(db, `presence-configs/${id}`)
	let alive = true
	const handler = (snapshot: any) => {
		const data = snapshot.val()
		if (!data) {
			callback(null)
			return
		}
		const userId = data.authorId
		if (!userId) {
			callback(mapRawToConfig(id, data))
			return
		}
		fetchAuthor(userId)
			.then(user => {
				if (!alive) return
				callback(
					mapRawToConfig(
						id,
						data,
						user?.avatar || user?.image || data.authorAvatar || '',
						user?.name || data.author || 'Unknown'
					)
				)
			})
			.catch(() => {
				if (!alive) return
				callback(mapRawToConfig(id, data))
			})
	}
	const unsubscribe = onValue(configRef, handler)
	return () => {
		alive = false
		unsubscribe()
	}
}

export function onStatusByIdChange(id: string, callback: (status: Status | null) => void) {
	const statusRef = ref(db, `status-configs/${id}`)
	let alive = true
	const handler = (snapshot: any) => {
		const data = snapshot.val()
		if (!data) {
			callback(null)
			return
		}
		const userId = data.authorId
		if (!userId) {
			callback(mapRawToStatus(id, data))
			return
		}
		fetchAuthor(userId)
			.then(user => {
				if (!alive) return
				callback(
					mapRawToStatus(
						id,
						{
							...data,
							authorAvatar: data.authorAvatar,
							author: data.author,
						},
						user?.avatar || user?.image || data.authorAvatar || '',
						user?.name || data.author || 'Unknown'
					)
				)
			})
			.catch(() => {
				if (!alive) return
				callback(mapRawToStatus(id, data))
			})
	}
	const unsubscribe = onValue(statusRef, handler)
	return () => {
		alive = false
		unsubscribe()
	}
}

export async function getConfigs(): Promise<Config[]> {
	const configsRef = ref(db, 'presence-configs')
	const snapshot = await get(configsRef)
	if (!snapshot.exists()) return []
	const data = snapshot.val() as Record<string, any>
	return Object.entries(data).map(([id, raw]) => mapRawToConfig(id, raw))
}

export async function getStatuses(): Promise<Status[]> {
	const statusesRef = ref(db, 'status-configs')
	const snapshot = await get(statusesRef)
	if (!snapshot.exists()) return []
	const data = snapshot.val() as Record<string, any>
	return Object.entries(data).map(([id, raw]) => mapRawToStatus(id, raw))
}

export async function getConfigById(id: string): Promise<Config | null> {
	const configRef = ref(db, `presence-configs/${id}`)
	const snapshot = await get(configRef)
	if (!snapshot.exists()) return null
	const data = snapshot.val()
	let user: UserRecord | null = null
	if (data.authorId) {
		try {
			user = await fetchAuthor(data.authorId)
		} catch {}
	}
	return mapRawToConfig(
		id,
		data,
		user?.avatar || user?.image || data.authorAvatar || '',
		user?.name || data.author || 'Unknown'
	)
}

export async function getStatusById(id: string): Promise<Status | null> {
	const statusRef = ref(db, `status-configs/${id}`)
	const snapshot = await get(statusRef)
	if (!snapshot.exists()) return null
	const data = snapshot.val()
	let user: UserRecord | null = null
	if (data.authorId) {
		try {
			user = await fetchAuthor(data.authorId)
		} catch {}
	}
	return mapRawToStatus(
		id,
		data,
		user?.avatar || user?.image || data.authorAvatar || '',
		user?.name || data.author || 'Unknown'
	)
}

export async function getConfigsByAuthor(authorId: string): Promise<Config[]> {
	const configsRef = ref(db, 'presence-configs')
	const snapshot = await get(configsRef)
	if (!snapshot.exists()) return []
	const data = snapshot.val()
	const allConfigs: Config[] = Object.entries(data)
		.filter(([id, raw]: [string, any]) => raw.authorId === authorId)
		.map(([id, raw]) => mapRawToConfig(id, raw))
	if (allConfigs.length === 0) {
		return []
	}
	const author = await fetchAuthor(authorId)
	if (!author) {
		return allConfigs
	}
	const configsWithAuthor = allConfigs.map(config =>
		mapRawToConfig(
			config.id,
			{ ...config, configData: config.configData },
			author.avatar || author.image || '',
			author.name || config.author
		)
	)
	return configsWithAuthor
}

export async function getStatusesByAuthor(authorId: string): Promise<Status[]> {
	const statusesRef = ref(db, 'status-configs')
	const snapshot = await get(statusesRef)
	if (!snapshot.exists()) return []
	const data = snapshot.val()
	const allStatuses: Status[] = Object.entries(data)
		.filter(([id, raw]: [string, any]) => raw.authorId === authorId)
		.map(([id, raw]) => mapRawToStatus(id, raw))
	if (allStatuses.length === 0) {
		return []
	}
	const author = await fetchAuthor(authorId)
	if (!author) {
		return allStatuses
	}
	const statusesWithAuthor = allStatuses.map(status =>
		mapRawToStatus(
			status.id,
			{ ...status },
			author.avatar || author.image || '',
			author.name || status.author
		)
	)
	return statusesWithAuthor
}

export async function createUserIfNotExists(
	userId: string,
	name?: string,
	avatar?: string,
	provider?: string
) {
	const userRef = ref(db, `users/${userId}`)
	await runTransaction(userRef, current => {
		if (current) {
			const next = { ...current }
			if (name) next.name = name
			if (avatar) next.avatar = avatar
			if (provider) next.provider = provider
			next.lastSeen = Date.now()
			return next
		}
		return {
			name: name ?? 'Unknown',
			avatar: avatar || '/logo.png',
			provider: provider || null,
			createdAt: Date.now(),
			lastSeen: Date.now(),
		}
	})
}

export async function deleteConfig(configId: string): Promise<void> {
	const cfgRef = ref(db, `presence-configs/${configId}`)
	const snap = await get(cfgRef)
	if (!snap.exists()) return
	await remove(cfgRef)
}

export async function deleteStatus(statusId: string): Promise<void> {
	const statusRef = ref(db, `status-configs/${statusId}`)
	const snap = await get(statusRef)
	if (!snap.exists()) return
	await remove(statusRef)
}

export async function fetchAuthorByName(name: string): Promise<UserRecordWithId | null> {
	const usersRef = ref(db, 'users')
	const snapshot = await get(usersRef)
	if (!snapshot.exists()) return null
	const data = snapshot.val() as Record<string, any>
	for (const [id, user] of Object.entries(data)) {
		if (user && typeof user === 'object' && user.name === name) {
			return { ...(user as UserRecord), id }
		}
	}
	return null
}
