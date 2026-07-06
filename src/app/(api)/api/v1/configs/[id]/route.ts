import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { Config, ConfigKind, Status } from '../route'

const db = admin.database()

type Params = { id: string }
type GetByIdPayload = { kind: ConfigKind }

const singleUserCache: Record<string, { data: any; updatedAt: number }> = {}
const CACHE_TTL = 30000

export async function POST(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = 'then' in ctx.params ? await ctx.params : ctx.params

		if (!id) {
			return NextResponse.json(
				{ error: 'MissingId', message: 'id is required in path' },
				{ status: 400 }
			)
		}

		const body = (await req.json()) as GetByIdPayload

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

		const targetRef = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
		const snap = await db.ref(targetRef).get()

		if (!snap.exists()) {
			return NextResponse.json({ error: 'NotFound' }, { status: 404 })
		}

		const data = snap.val() as any
		const authorId = data?.authorId ? String(data.authorId) : null

		let user: any = null
		if (authorId) {
			const now = Date.now()
			const cached = singleUserCache[authorId]

			if (cached && now - cached.updatedAt < CACHE_TTL) {
				user = cached.data
			} else {
				const userSnap = await db.ref(`users/${authorId}`).get()
				if (userSnap.exists()) {
					user = userSnap.val()
					singleUserCache[authorId] = { data: user, updatedAt: now }
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
