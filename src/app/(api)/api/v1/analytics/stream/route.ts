import { mapRawToStats } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'

const db = admin.database()

export async function GET(req: Request) {
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

			const initialSnap = await db.ref('stats').get()
			const initial = mapRawToStats(initialSnap.val() || {})
			send('ready', initial)

			const ref = db.ref('stats')

			const onValueHandler = (snap: any) => {
				if (closed) return
				const next = mapRawToStats(snap.val() || {})
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
