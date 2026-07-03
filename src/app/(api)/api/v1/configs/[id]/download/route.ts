import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = { id: string }

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { id } = await ctx.params

		if (!id) {
			return NextResponse.json(
				{ error: 'MissingId', message: 'id is required in path' },
				{ status: 400 }
			)
		}

		const url = new URL(req.url)
		const kind = url.searchParams.get('kind')

		if (kind !== 'presence' && kind !== 'status') {
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind must be "presence" or "status"' },
				{ status: 400 }
			)
		}

		const path = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
		const snap = await db.ref(path).get()

		if (!snap.exists()) {
			return NextResponse.json({ error: 'NotFound' }, { status: 404 })
		}

		const data = snap.val()
		const mapped = kind === 'presence' ? mapRawToConfig(id, data) : mapRawToStatus(id, data)

		const json = JSON.stringify(mapped.configData, null, 2)
		const fileName = `${mapped.title || 'config'}.json`

		return new NextResponse(json, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${fileName}"`,
			},
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
