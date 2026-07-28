import { Config, mapRawToConfig, mapRawToStatus, Status } from '@/services/firebase'
import { admin } from '@/services/firebase-admin'
import { redis } from '@/services/redis'
import { DataSnapshot } from 'firebase/database'
import { NextResponse } from 'next/server'

const db = admin.database()

export type ConfigKind = 'presence' | 'status'

type GetAllPayload = {
	kind: ConfigKind
	offset?: number
	limit?: number
}

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
	const raw = snap.val()
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

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as GetAllPayload

		if (!body || !body.kind) {
			return NextResponse.json(
				{ error: 'InvalidPayload', message: 'kind is required' },
				{ status: 400 }
			)
		}

		const { kind } = body

		if (kind !== 'presence' && kind !== 'status') {
			return NextResponse.json(
				{ error: 'InvalidKind', message: `Unsupported kind: ${kind}` },
				{ status: 400 }
			)
		}

		const offset = typeof body.offset === 'number' && body.offset >= 0 ? body.offset : 0
		const limit =
			typeof body.limit === 'number' && body.limit > 0 && body.limit <= 100 ? body.limit : 24

		const zKey = kind === 'presence' ? 'stats:presence-downloads' : 'stats:status-downloads'

		const rankedIds = await redis.zrange<string[]>(zKey, 0, -1, {
			rev: true,
			offset,
			count: limit,
		})

		let items: Array<Config | Status> = []
		let total = 0

		if (rankedIds && rankedIds.length > 0) {
			const refBase = kind === 'presence' ? 'presence-configs' : 'status-configs'
			const snaps = await Promise.all(
				rankedIds.map((id: string) => db.ref(`${refBase}/${id}`).get())
			)

			const valid: Array<{ id: string; raw: any }> = []
			snaps.forEach((snap: DataSnapshot, idx: number) => {
				if (!snap.exists()) return
				valid.push({ id: rankedIds[idx] as string, raw: snap.val() })
			})

			const localUsersMap: Record<string, any> = {}
			const missingAuthorIds = new Set<string>()

			for (const { raw } of valid) {
				if (raw?.authorId) {
					missingAuthorIds.add(String(raw.authorId))
				}
			}

			if (missingAuthorIds.size > 0) {
				const ids = Array.from(missingAuthorIds)
				const redisKeys = ids.map(id => `cache:user:${id}`)
				const cachedUsersRaw = await redis.mget<string[]>(redisKeys)
				const idsToFetchFromDb: string[] = []

				cachedUsersRaw.forEach((cachedJson, idx) => {
					const currentId = ids[idx]
					if (!currentId) return

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
					await Promise.all(
						idsToFetchFromDb.map(async (uid: string) => {
							const u = await loadUser(uid)
							if (u) localUsersMap[uid] = u
						})
					)
				}
			}

			items = valid.map(({ id, raw }) => {
				const r = raw
				const authorId = r.authorId ? String(r.authorId) : null
				const user = authorId ? localUsersMap[authorId] : null

				const avatar = user?.avatar || user?.image || r?.authorAvatar || '/logo.png'
				const name = user?.name || r?.author || 'Unknown User'
				const tag =
					typeof user?.tag !== 'undefined' && user?.tag !== null
						? String(user.tag).padStart(4, '0')
						: r?.authorTag || undefined

				if (kind === 'presence') {
					const cfg = mapRawToConfig(id, r, avatar, name)
					cfg.authorTag = tag
					return cfg
				} else {
					const st = mapRawToStatus(id, r, avatar, name)
					st.authorTag = tag
					return st
				}
			})

			total = await redis.zcard(zKey)

			return NextResponse.json({ items, total, offset, limit }, { status: 200 })
		}

		const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'
		const configsSnap = await db.ref(targetRef).get()

		if (!configsSnap.exists()) {
			return NextResponse.json({ items: [], total: 0, offset, limit }, { status: 200 })
		}

		const configsData = configsSnap.val() as Record<string, any>
		const configEntries = Object.entries(configsData)

		const localUsersMap: Record<string, any> = {}
		const missingAuthorIds = new Set<string>()

		for (const [, raw] of configEntries) {
			if (raw?.authorId) {
				missingAuthorIds.add(String(raw.authorId))
			}
		}

		if (missingAuthorIds.size > 0) {
			const ids = Array.from(missingAuthorIds)
			const redisKeys = ids.map(id => `cache:user:${id}`)

			const cachedUsersRaw = await redis.mget<string[]>(redisKeys)
			const idsToFetchFromDb: string[] = []

			cachedUsersRaw.forEach((cachedJson, idx) => {
				const currentId = ids[idx]
				if (!currentId) return

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
						idsToFetchFromDb.map(async (uid: string) => {
							const u = await loadUser(uid)
							if (u) localUsersMap[uid] = u
						})
					)
				}
			}
		}

		const allItems = configEntries.map(([id, raw]) => {
			const r = raw
			const authorId = r.authorId ? String(r.authorId) : null
			const user = authorId ? localUsersMap[authorId] : null

			const avatar = user?.avatar || user?.image || r?.authorAvatar || '/logo.png'
			const name = user?.name || r?.author || 'Unknown User'
			const tag =
				typeof user?.tag !== 'undefined' && user?.tag !== null
					? String(user.tag).padStart(4, '0')
					: r?.authorTag || undefined

			if (kind === 'presence') {
				const cfg = mapRawToConfig(id, r, avatar, name)
				cfg.authorTag = tag
				return cfg
			} else {
				const st = mapRawToStatus(id, r, avatar, name)
				st.authorTag = tag
				return st
			}
		})

		const sorted = allItems.sort((a, b) => {
			const aDownloads =
				typeof a.downloads === 'number'
					? a.downloads
					: parseInt(String((a as any).downloads ?? '0')) || 0
			const bDownloads =
				typeof b.downloads === 'number'
					? b.downloads
					: parseInt(String((b as any).downloads ?? '0')) || 0
			return bDownloads - aDownloads
		})

		total = sorted.length
		const slice = sorted.slice(offset, offset + limit)

		return NextResponse.json({ items: slice, total, offset, limit }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
