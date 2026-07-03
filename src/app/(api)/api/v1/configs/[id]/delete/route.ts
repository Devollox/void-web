import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import type { ConfigKind } from '../../route'

const db = admin.database()

type Params = { id: string }

interface UserData {
	id: string
	name?: string
	avatar?: string
	image?: string
}

async function findUserIdByConfig(id: string, kind: ConfigKind): Promise<UserData | null> {
	try {
		const usersSnap = await db.ref('users').get()
		if (!usersSnap.exists()) {
			return null
		}

		const users = usersSnap.val() as Record<string, any>

		for (const [userId, data] of Object.entries(users)) {
			const configs = (data as any).configs || {}
			if (kind === 'presence' && configs.presence && configs.presence[id]) {
				return { id: userId, ...(data as any) }
			}
			if (kind === 'status' && configs.status && configs.status[id]) {
				return { id: userId, ...(data as any) }
			}
		}

		return null
	} catch (e) {
		console.error('findUserIdByConfig error', e)
		return null
	}
}

export async function DELETE(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = await ctx.params

		if (!id) {
			return NextResponse.json(
				{ error: 'MissingId', message: 'id is required in path' },
				{ status: 400 }
			)
		}

		const kind = new URL(req.url).searchParams.get('kind') as ConfigKind | null

		if (kind !== 'presence' && kind !== 'status') {
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind must be "presence" or "status"' },
				{ status: 400 }
			)
		}

		const owner = await findUserIdByConfig(id, kind)
		if (!owner) {
			return NextResponse.json(
				{ error: 'OwnerNotFound', message: 'No user owns this config' },
				{ status: 404 }
			)
		}

		const updates: Record<string, any> = {}

		if (kind === 'presence') {
			updates[`presence-configs/${id}`] = null
			updates[`users/${owner.id}/configs/presence/${id}`] = null
		} else {
			updates[`status-configs/${id}`] = null
			updates[`users/${owner.id}/configs/status/${id}`] = null
		}

		await db.ref().update(updates)

		return NextResponse.json({ ok: true, ownerId: owner.id }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
