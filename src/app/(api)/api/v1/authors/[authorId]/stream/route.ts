import { sseManager } from '@/lib/sse-manager'
import '@api/_bootstrap'
import { loadAuthorConfigsById } from '@lib/shared'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

type Params = {
	authorId: string
}

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	const { authorId } = 'then' in ctx.params ? await ctx.params : ctx.params

	if (!authorId) {
		return NextResponse.json({ ok: false, error: 'MissingAuthorId' }, { status: 400 })
	}

	const initial = await loadAuthorConfigsById(authorId)
	if (!initial) {
		return NextResponse.json({
			user: null,
			presenceConfigs: [],
			statusConfigs: [],
		})
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

			send('ready', initial)

			sseManager.addAuthorSub({
				id: streamId,
				authorId,
				send,
				close: () => {
					if (closed) return
					closed = true
					sseManager.removeAuthorSub(streamId)
					try {
						controller.close()
					} catch {}
				},
			})

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				sseManager.removeAuthorSub(streamId)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			if (closed) return
			closed = true
			sseManager.removeAuthorSub(streamId)
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
