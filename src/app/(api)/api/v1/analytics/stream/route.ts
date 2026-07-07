import { sseManager } from '@/lib/sse-manager'
import { admin } from '@/service/firebase-admin'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'

const db = admin.database()

async function loadStats() {
	const [downloadsSnap, visitorsSnap] = await Promise.all([
		db.ref('stats/downloads').get(),
		db.ref('stats/visitors').get(),
	])

	const downloads = downloadsSnap.exists() ? downloadsSnap.val() : { count: 0, lastUpdated: 0 }
	const visitors = visitorsSnap.exists() ? visitorsSnap.val() : { count: 0, lastUpdated: 0 }

	return {
		downloads: {
			count: typeof downloads?.count === 'number' ? downloads.count : 0,
			lastUpdated: typeof downloads?.lastUpdated === 'number' ? downloads.lastUpdated : 0,
		},
		visitors: {
			count: typeof visitors?.count === 'number' ? visitors.count : 0,
			lastUpdated: typeof visitors?.lastUpdated === 'number' ? visitors.lastUpdated : 0,
		},
	}
}

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

			const initial = await loadStats()
			send('update', initial)

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
