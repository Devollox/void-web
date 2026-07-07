import { sseManager } from '@/lib/sse-manager'
import '@api/_bootstrap'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { ConfigKind } from '../../route'

type Params = { id: string }

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
	const streamId = randomUUID()

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			sseManager.addConfigDetailsSub({
				id: streamId,
				kind,
				configId: id,
				send,
				close: () => {
					if (closed) return
					closed = true
					sseManager.removeConfigDetailsSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				sseManager.removeConfigDetailsSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return
			closed = true
			sseManager.removeConfigDetailsSub(streamId)
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
