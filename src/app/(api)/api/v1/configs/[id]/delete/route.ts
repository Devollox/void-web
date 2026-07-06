import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import type { ConfigKind } from '../../route'

const db = admin.database()

type Params = { id: string }

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

		const configRefPath = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
		const configSnap = await db.ref(configRefPath).get()

		if (!configSnap.exists()) {
			return NextResponse.json(
				{ error: 'ConfigNotFound', message: 'Config does not exist' },
				{ status: 404 }
			)
		}

		const configData = configSnap.val() as any
		const authorId = configData?.authorId ? String(configData.authorId) : null

		if (!authorId) {
			return NextResponse.json(
				{ error: 'AuthorNotFound', message: 'Config has no associated author ID' },
				{ status: 400 }
			)
		}

		const updates: Record<string, any> = {}

		if (kind === 'presence') {
			updates[`presence-configs/${id}`] = null
			updates[`users/${authorId}/configs/presence/${id}`] = null
		} else {
			updates[`status-configs/${id}`] = null
			updates[`users/${authorId}/configs/status/${id}`] = null
		}

		await db.ref().update(updates)

		return NextResponse.json({ ok: true }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
