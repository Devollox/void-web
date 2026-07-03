import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { Config, ConfigKind, Status } from '../route'

const db = admin.database()

type Params = { id: string }
type GetByIdPayload = { kind: ConfigKind }
type GetByIdResponse = Config | Status

interface UserData {
	name?: string
	avatar?: string
	image?: string
}

export async function findUserByConfig(id: string, kind: ConfigKind): Promise<UserData | null> {
	try {
		const usersSnap = await db.ref('users').get()
		if (!usersSnap.exists()) {
			return null
		}

		const users = usersSnap.val() as Record<string, any>

		for (const [, data] of Object.entries(users)) {
			const configs = (data as any).configs || {}
			if (kind === 'presence' && configs.presence && configs.presence[id]) {
				return data as UserData
			}
			if (kind === 'status' && configs.status && configs.status[id]) {
				return data as UserData
			}
		}

		return null
	} catch (e) {
		console.error('findUserByConfig error', e)
		return null
	}
}

export async function POST(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = await ctx.params

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

		if (kind === 'presence') {
			const snap = await db.ref(`presence-configs/${id}`).get()
			if (!snap.exists()) {
				return NextResponse.json({ error: 'NotFound' }, { status: 404 })
			}

			const data = snap.val() as any
			const user = await findUserByConfig(id, kind)

			const config: GetByIdResponse = mapRawToConfig(
				id,
				data,
				user?.avatar || user?.image || data?.authorAvatar || '',
				user?.name || data?.author || 'Unknown'
			)

			return NextResponse.json(config, { status: 200 })
		}

		if (kind === 'status') {
			const snap = await db.ref(`status-configs/${id}`).get()
			if (!snap.exists()) {
				return NextResponse.json({ error: 'NotFound' }, { status: 404 })
			}

			const data = snap.val() as any
			const user = await findUserByConfig(id, kind)

			const status: GetByIdResponse = mapRawToStatus(
				id,
				data,
				user?.avatar || user?.image || data?.authorAvatar || '',
				user?.name || data?.author || 'Unknown'
			)

			return NextResponse.json(status, { status: 200 })
		}

		return NextResponse.json(
			{ error: 'InvalidKind', message: `Unsupported kind: ${kind}` },
			{ status: 400 }
		)
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
