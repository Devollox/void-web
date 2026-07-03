import { getStatusesByAuthor } from '@/service/firebase'
import { NextResponse } from 'next/server'

type Params = {
	id: string
}

export async function GET(_req: Request, ctx: { params: Promise<Params> | Params }) {
	const { id } = await ctx.params
	try {
		const configs = await getStatusesByAuthor(id)

		return NextResponse.json({
			configs,
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
