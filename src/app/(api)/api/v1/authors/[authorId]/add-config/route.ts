import { createPresenceConfig, createStatusConfig } from '@/service/firebase-admin'
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
