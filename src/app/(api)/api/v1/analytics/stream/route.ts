import { sseManager } from '@/lib/sse-manager'
import { mapRawToStats } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'

const db = admin.database()

export async function GET(req: Request) {
	const encoder = new TextEncoder()
	let closed = false
	const streamId = randomUUID()

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

			sseManager.addStatsSub({
				id: streamId,
				send,
				close: () => {
					if (closed) return
					closed = true
					sseManager.removeStatsSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				sseManager.removeStatsSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return
			closed = true
			sseManager.removeStatsSub(streamId)
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
