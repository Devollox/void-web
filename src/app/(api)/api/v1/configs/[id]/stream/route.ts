import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { ConfigKind } from '../../route'

const db = admin.database()

type Params = { id: string }

const singleUserCache: Record<string, { data: any; updatedAt: number }> = {}
const CACHE_TTL = 30000

async function loadConfigSnapshot(id: string, kind: ConfigKind) {
	const refPath = kind === 'presence' ? `presence-configs/${id}` : `status-configs/${id}`
	const snap = await db.ref(refPath).get()
	if (!snap.exists()) return null

	const data = snap.val() as any
	const authorId = data?.authorId ? String(data.authorId) : null

	let user: any = null
	if (authorId) {
		const now = Date.now()
		const cached = singleUserCache[authorId]

		if (cached && now - cached.updatedAt < CACHE_TTL) {
			user = cached.data
		} else {
			const userSnap = await db.ref(`users/${authorId}`).get()
			if (userSnap.exists()) {
				user = userSnap.val()
				singleUserCache[authorId] = { data: user, updatedAt: now }
			}
		}
	}

	const avatar = user?.avatar || user?.image || data?.authorAvatar || '/logo.png'
	const name = user?.name || data?.author || 'Unknown User'
	const tag = user?.tag ? String(user.tag).padStart(4, '0') : data?.authorTag || undefined

	if (kind === 'presence') {
		const cfg = mapRawToConfig(id, data, avatar, name) as any
		cfg.authorTag = tag
		return cfg
	}

	const st = mapRawToStatus(id, data, avatar, name) as any
	st.authorTag = tag
	return st
}

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	const { id } = 'then' in ctx.params ? await ctx.params : ctx.params

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
					cleanup()
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

			const cleanup = () => {
				if (closed) return
				closed = true
				clearInterval(ping)
				ref.off('value', onValueHandler)
				try {
					controller.close()
				} catch {}
			}

			req.signal.addEventListener('abort', cleanup)
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
