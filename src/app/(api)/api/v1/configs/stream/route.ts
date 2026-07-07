import { sseManager } from '@/lib/sse-manager'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { ConfigKind } from '../route'

type QueryKind = ConfigKind

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
	const streamId = randomUUID()

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			sseManager.addConfigListSub({
				id: streamId,
				kind,
				send,
				close: () => {
					if (closed) return
					closed = true
					sseManager.removeConfigListSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				sseManager.removeConfigListSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return
			closed = true
			sseManager.removeConfigListSub(streamId)
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
