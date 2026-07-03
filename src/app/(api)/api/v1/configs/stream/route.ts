import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { Config, ConfigKind, fetchAllUsers, Status } from '../route'

const db = admin.database()

type QueryKind = ConfigKind

async function loadAllByKind(kind: QueryKind) {
	const users = await fetchAllUsers()

	if (kind === 'presence') {
		const snap = await db.ref('presence-configs').get()
		if (!snap.exists()) return []

		const data = snap.val() as Record<string, any>

		const list: Config[] = Object.entries(data).map(([id, raw]) => {
			const r = raw as any

			let user: any = null

			for (const [, userData] of Object.entries(users)) {
				const configs = (userData as any).configs || {}
				if (configs.presence && configs.presence[id]) {
					user = userData
					break
				}
			}

			return mapRawToConfig(
				id,
				r,
				user?.avatar || user?.image || '',
				user?.name || r?.author || 'Unknown'
			)
		})

		return list
	}

	const snap = await db.ref('status-configs').get()
	if (!snap.exists()) return []

	const data = snap.val() as Record<string, any>

	const list: Status[] = Object.entries(data).map(([id, raw]) => {
		const r = raw as any

		let user: any = null

		for (const [, userData] of Object.entries(users)) {
			const configs = (userData as any).configs || {}
			if (configs.status && configs.status[id]) {
				user = userData
				break
			}
		}

		return mapRawToStatus(
			id,
			r,
			user?.avatar || user?.image || '',
			user?.name || r?.author || 'Unknown'
		)
	})

	return list
}

export async function GET(req: Request) {
	const kind = new URL(req.url).searchParams.get('kind') as QueryKind | null

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

			const initial = await loadAllByKind(kind)
			send('ready', initial)

			const refPath = kind === 'presence' ? 'presence-configs' : 'status-configs'
			const ref = db.ref(refPath)

			const onValueHandler = async () => {
				if (closed) return
				const next = await loadAllByKind(kind)
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
