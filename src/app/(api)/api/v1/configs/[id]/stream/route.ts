import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { ConfigKind } from '../../route'

const db = admin.database()

type Params = { id: string }

async function loadConfigSnapshot(id: string, kind: ConfigKind) {
	const refPath = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
	const snap = await db.ref(refPath).get()
	if (!snap.exists()) return null

	const data = snap.val() as any
	const authorId = data?.authorId ? String(data.authorId) : null

	let user: any = null
	if (authorId) {
		const userSnap = await db.ref(`users/${authorId}`).get()
		if (userSnap.exists()) {
			user = userSnap.val()
		}
	}

	if (kind === 'presence') {
		return mapRawToConfig(
			id,
			data,
			user?.avatar || user?.image || data?.authorAvatar || '/logo.png',
			user?.name || data?.author || 'Unknown User'
		)
	}

	return mapRawToStatus(
		id,
		data,
		user?.avatar || user?.image || data?.authorAvatar || '/logo.png',
		user?.name || data?.author || 'Unknown User'
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
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			const initial = await loadConfigSnapshot(id, kind)
			if (!initial) {
				send('not-found', { id, kind })
				try {
					controller.close()
				} catch {}
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
				try {
					controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
				} catch {}
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
