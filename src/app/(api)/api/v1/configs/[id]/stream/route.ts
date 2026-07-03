import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { ConfigKind } from '../../route'

const db = admin.database()

type Params = { id: string }
type GetByIdPayload = { kind: ConfigKind }

interface UserData {
	name?: string
	avatar?: string
	image?: string
}

export async function findUserByConfig(id: string, kind: ConfigKind): Promise<UserData | null> {
	try {
		const usersSnap = await db.ref('users').get()
		if (!usersSnap.exists()) return null

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

async function loadConfigSnapshot(id: string, kind: ConfigKind) {
	if (kind === 'presence') {
		const snap = await db.ref(`presence-configs/${id}`).get()
		if (!snap.exists()) return null

		const data = snap.val() as any
		const user = await findUserByConfig(id, kind)

		return mapRawToConfig(
			id,
			data,
			user?.avatar || user?.image || data?.authorAvatar || '',
			user?.name || data?.author || 'Unknown'
		)
	}

	const snap = await db.ref(`status-configs/${id}`).get()
	if (!snap.exists()) return null

	const data = snap.val() as any
	const user = await findUserByConfig(id, kind)

	return mapRawToStatus(
		id,
		data,
		user?.avatar || user?.image || data?.authorAvatar || '',
		user?.name || data?.author || 'Unknown'
	)
}

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
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
			{ error: 'InvalidKind', message: 'kind query param is required' },
			{ status: 400 }
		)
	}

	const encoder = new TextEncoder()
	let closed = false

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
			}

			const initial = await loadConfigSnapshot(id, kind)
			if (!initial) {
				send('not-found', { id, kind })
				controller.close()
				return
			}

			send('ready', initial)

			const refPath = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
			const ref = db.ref(refPath)

			const onValueHandler = async () => {
				if (closed) return
				const next = await loadConfigSnapshot(id, kind)
				if (!next) {
					send('not-found', { id, kind })
					return
				}
				send('update', next)
			}

			ref.on('value', onValueHandler)

			const ping = setInterval(() => {
				if (closed) return
				controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
			}, 25000)

			req.signal.addEventListener('abort', () => {
				closed = true
				clearInterval(ping)
				ref.off('value', onValueHandler)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			closed = true
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'Content-Encoding': 'none',
			'X-Accel-Buffering': 'no',
		},
	})
}
