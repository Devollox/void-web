import { db } from '@service/firebase'
import { get, ref, remove } from 'firebase/database'
import { NextResponse } from 'next/server'

type Params = {
	id: string
}

export async function GET(_req: Request, context: { params: Promise<Params> | Params }) {
	const { id } = await context.params

	const cfgRef = ref(db, `presence-configs/${id}`)
	const snap = await get(cfgRef)

	if (!snap.exists()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const { authorId, ...cleaned } = snap.val()

	return NextResponse.json(cleaned.configData || {}, { status: 200 })
}

export async function DELETE(_req: Request, context: { params: Promise<Params> | Params }) {
	const { id } = await context.params

	const cfgRef = ref(db, `presence-configs/${id}`)
	const snap = await get(cfgRef)

	if (!snap.exists()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	await remove(cfgRef)

	return NextResponse.json({ ok: true }, { status: 200 })
}
