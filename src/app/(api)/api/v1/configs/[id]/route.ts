import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'
import { Config, ConfigKind, Status } from '../route'

const db = admin.database()
const USER_CACHE_TTL = 60

type Params = { id: string }

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = 'then' in ctx.params ? await ctx.params : ctx.params

		if (!id) {
			return NextResponse.json(
				{ error: 'MissingId', message: 'id is required in path' },
				{ status: 400 }
			)
		}

		const kind = new URL(req.url).searchParams.get('kind') as ConfigKind | null

		if (kind !== 'presence' && kind !== 'status') {
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind query param is required' },
				{ status: 400 }
			)
		}

		const targetRef = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
		const snap = await db.ref(targetRef).get()

		if (!snap.exists()) {
			return NextResponse.json({ error: 'NotFound' }, { status: 404 })
		}

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
			const config = mapRawToConfig(id, data, avatar, name) as Config
			config.authorTag = tag
			return NextResponse.json(config, { status: 200 })
		} else {
			const status = mapRawToStatus(id, data, avatar, name) as Status
			status.authorTag = tag
			return NextResponse.json(status, { status: 200 })
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
