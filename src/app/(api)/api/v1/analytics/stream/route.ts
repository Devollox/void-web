import { sseManager } from '@/lib/sse-manager'
import { mapRawToStats, type Stats } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'

const db = admin.database()

function toStats(raw: any): Stats {
	return mapRawToStats(raw || {})
}

export async function GET(req: Request) {
	const encoder = new TextEncoder()
	let closed = false
	const streamId = randomUUID()

	const initialSnap = await db.ref('stats').get()
	const initial = toStats(initialSnap.val())

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

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
			'X-Accel-Buffering': 'no',
		},
	})
}
