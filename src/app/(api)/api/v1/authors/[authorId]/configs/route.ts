import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = {
	authorId: string
}

interface UserRaw {
	name?: string
	avatar?: string
	image?: string
	tag?: string
	authorTag?: string
	provider?: string
	createdAt?: number
	lastSeen?: number
	configs?: {
		presence?: Record<string, boolean>
		status?: Record<string, boolean>
	}
}

function getClientIp(req: Request): string {
	const forwardedFor = req.headers.get('x-forwarded-for')
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim()
	}
	return '127.0.0.1'
}

async function checkRateLimit(ip: string) {
	const freqKey = `rl:freq:${ip}`
	const blockKey = `rl:block:${ip}`

	const isBlocked = await redis.get<number>(blockKey)
	if (isBlocked) {
		const ttl = await redis.ttl(blockKey)
		return { blocked: true, remainingMs: ttl * 1000 }
	}

	const requests = await redis.incr(freqKey)
	if (requests === 1) {
		await redis.expire(freqKey, 1)
	}

	if (requests > 2) {
		return { tooFrequent: true }
	}

	return { ok: true }
}

async function registerFail(ip: string) {
	const failKey = `rl:fails:${ip}`
	const blockKey = `rl:block:${ip}`

	const fails = await redis.incr(failKey)
	if (fails === 1) {
		await redis.expire(failKey, 60)
	}

	if (fails >= 10) {
		await redis.set(blockKey, 1, { ex: 600 })
		await redis.del(failKey)
	}
}

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	const { authorId } = 'then' in ctx.params ? await ctx.params : ctx.params

	if (!authorId) {
		return NextResponse.json({ ok: false, error: 'MissingAuthorId' }, { status: 400 })
	}

	const ip = getClientIp(req)
	const rl = await checkRateLimit(ip)

	if (rl.blocked) {
		return NextResponse.json(
			{
				ok: false,
				error: 'TooManyAttempts',
				message: `Too many invalid requests. Try again in ${Math.ceil(
					(rl.remainingMs ?? 0) / 1000
				)} seconds.`,
			},
			{ status: 429 }
		)
	}
	if (rl.tooFrequent) {
		return NextResponse.json(
			{
				ok: false,
				error: 'TooFrequent',
				message: 'Too many requests. Please wait at least 1 second between requests.',
			},
			{ status: 429 }
		)
	}

	try {
		const userSnap = await db.ref(`users/${authorId}`).get()

		if (!userSnap.exists()) {
			await registerFail(ip)
			return NextResponse.json({
				user: null,
				presenceConfigs: [],
				statusConfigs: [],
			})
		}

		const userRaw = userSnap.val() as UserRaw
		const presenceMap = userRaw.configs?.presence || {}
		const statusMap = userRaw.configs?.status || {}

		const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
		const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

		const [presenceSnaps, statusSnaps] = await Promise.all([
			Promise.all(presenceIds.map(id => db.ref(`presence-configs/${id}`).get())),
			Promise.all(statusIds.map(id => db.ref(`status-configs/${id}`).get())),
		])

		const avatarFromUser = userRaw.avatar || userRaw.image || '/logo.png'
		const tagFromUser = userRaw.tag || userRaw.authorTag || null
		const authorName = userRaw.name || 'Unknown User'
		const formattedTag = tagFromUser ? String(tagFromUser).padStart(4, '0') : undefined

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
					authorTag: formattedTag,
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
					authorTag: formattedTag,
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

		return NextResponse.json({
			user: {
				id: authorId,
				name: userRaw.name || null,
				avatar: userRaw.avatar || userRaw.image || null,
				tag: formattedTag || null,
				provider: userRaw.provider || null,
				createdAt: userRaw.createdAt || null,
				lastSeen: userRaw.lastSeen || null,
				configs: {
					presence: syncedPresenceMap,
					status: syncedStatusMap,
				},
			},
			presenceConfigs,
			statusConfigs,
		})
	} catch (e: any) {
		await registerFail(ip)
		return NextResponse.json(
			{ ok: false, error: 'InternalError', message: e?.message || String(e) },
			{ status: 500 }
		)
	}
}
