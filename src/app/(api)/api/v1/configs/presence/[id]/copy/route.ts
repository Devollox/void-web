import { getConfigById } from '@service/firebase'
import { NextResponse } from 'next/server'

type Params = {
	id: string
}

export async function GET(_req: Request, ctx: { params: Promise<Params> | Params }) {
	const { id } = await ctx.params
	const config = await getConfigById(id)

	if (!config) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	return NextResponse.json(config, { status: 200 })
}
