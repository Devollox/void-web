import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

type Params = { authorId: string }

type AddConfigBody = {
	kind: 'presence' | 'status'
	title: string
	description: string
	author: string
	configData: any
	downloads: number
	uploadedAt: number
	averageColor?: string
}

const db = admin.database()

export function buildAuthorTag(authorId: string) {
	const digitsOnly = authorId.replace(/\D/g, '')
	const head = digitsOnly.slice(0, 4)
	return head.padStart(4, '0')
}

export async function createPresenceConfig(authorId: string, body: AddConfigBody): Promise<string> {
	const ref = db.ref('presence-configs').push()
	const { kind, ...rest } = body

	await ref.set({
		...rest,
		authorTag: buildAuthorTag(authorId),
	})

	const id = ref.key || 'unknown'

	const userConfigsRef = db.ref(`users/${authorId}/configs/presence/${id}`)
	await userConfigsRef.set(true)

	return id
}

export async function createStatusConfig(authorId: string, body: AddConfigBody): Promise<string> {
	const ref = db.ref('status-configs').push()
	const { kind, ...rest } = body

	await ref.set({
		...rest,
		authorTag: buildAuthorTag(authorId),
	})

	const id = ref.key || 'unknown'

	const userConfigsRef = db.ref(`users/${authorId}/configs/status/${id}`)
	await userConfigsRef.set(true)

	return id
}

export async function POST(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { authorId } = await ctx.params

		if (!authorId) {
			return NextResponse.json(
				{ error: 'MissingAuthorId', message: 'Author id is required in path' },
				{ status: 400 }
			)
		}

		const body = (await req.json()) as AddConfigBody

		if (!body.kind || (body.kind !== 'presence' && body.kind !== 'status')) {
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind must be "presence" or "status"' },
				{ status: 400 }
			)
		}

		if (!body.title || !body.configData) {
			return NextResponse.json(
				{ error: 'InvalidPayload', message: 'title and configData are required' },
				{ status: 400 }
			)
		}

		const userSnap = await db.ref(`users/${authorId}`).get()
		if (!userSnap.exists()) {
			return NextResponse.json(
				{ error: 'AuthorNotFound', message: 'Author does not exist' },
				{ status: 404 }
			)
		}

		const createdId =
			body.kind === 'presence'
				? await createPresenceConfig(authorId, body)
				: await createStatusConfig(authorId, body)

		return NextResponse.json({ id: createdId }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
