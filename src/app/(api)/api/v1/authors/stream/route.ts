import { sseManager } from '@/lib/sse-manager'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import '@api/_bootstrap'
import { loadAuthorConfigsById } from '@lib/shared'
import { randomUUID } from 'crypto'

const db = admin.database()
const REDIS_TTL = 60

interface UserRaw {
	name?: string | null
	avatar?: string | null
	image?: string | null
	tag?: string | null
	authorTag?: string | null
	provider?: string | null
	createdAt?: number | null
	lastSeen?: number | null
	configs?: {
		presence?: Record<string, boolean>
		status?: Record<string, boolean>
	} | null
}

async function resolveUserByHandle(username: string, tag: string) {
	if (!username || !tag) return null

	const cacheKey = `cache:handle:${username.toLowerCase()}#${tag}`
	const cached = await redis.get<string>(cacheKey)

	if (cached) {
		try {
			return typeof cached === 'object' ? cached : JSON.parse(cached)
		} catch {
			return null
		}
	}

	const usersSnap = await db.ref('users').get()
	if (!usersSnap.exists()) return null

	const users = usersSnap.val() as Record<string, any>

	const entry = Object.entries(users).find(
		([, u]) =>
			u.name === username && String(u.tag ?? '').padStart(4, '0') === String(tag).padStart(4, '0')
	)

	if (!entry) return null

	const [authorId, userRaw] = entry
	const result = { authorId, userRaw }

	await redis.set(cacheKey, JSON.stringify(result), { ex: REDIS_TTL })
	return result
}

export async function GET(req: Request) {
	const url = new URL(req.url)
	const username = url.searchParams.get('username') || ''
	const tag = url.searchParams.get('tag') || ''

	if (!username || !tag) {
		return new Response('BadRequest', { status: 400 })
	}

	const encoder = new TextEncoder()
	let closed = false
	const streamId = randomUUID()
	let authorId: string | null = null

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			const resolved = await resolveUserByHandle(username, tag)
			if (!resolved || !resolved.authorId) {
				send('not-found', { username, tag })
				try {
					controller.close()
				} catch {}
				closed = true
				return
			}

			authorId = String(resolved.authorId)

			const initial = await loadAuthorConfigsById(authorId)
			if (!initial || !initial.user) {
				send('not-found', { username, tag })
				try {
					controller.close()
				} catch {}
				closed = true
				return
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
