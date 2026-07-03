import { getStatusById } from '@/service/firebase'
import { NextResponse } from 'next/server'

type Params = {
	id: string
}

export async function GET(_req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = await ctx.params

		const config = await getStatusById(id)
		if (!config) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 })
		}

		const json = JSON.stringify(config.configData, null, 2)

		return new NextResponse(json, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${config.title || 'config'}.json"`,
			},
		})
	} catch (err) {
		console.error('DOWNLOAD ROUTE ERROR', err)

		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
