import { auth } from '@/lib/auth'
import { admin } from '@/service/firebase-admin'

const db = admin.database()

type AuthorConfigs = {
	user: {
		name: string | null
		avatar: string | null
		tag: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: any[]
	statusConfigs: any[]
}

async function resolveUserByHandle(username: string, tag: string) {
	const usersSnap = await db.ref('users').get()
	if (!usersSnap.exists()) return null

	const users = usersSnap.val() as Record<string, any>

	const entry = Object.entries(users).find(
		([, u]) =>
			u.name === username && String(u.tag ?? '').padStart(4, '0') === String(tag).padStart(4, '0')
	)

	if (!entry) return null

	const [authorId, userRaw] = entry
	return { authorId, userRaw }
}

async function loadAuthorConfigsById(authorId: string): Promise<AuthorConfigs | null> {
	const userSnap = await db.ref(`users/${authorId}`).get()
	if (!userSnap.exists()) return null

	const userRaw = userSnap.val() as any
	const presenceMap = userRaw.configs?.presence || {}
	const statusMap = userRaw.configs?.status || {}

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const [presenceSnaps, statusSnaps] = await Promise.all([
		Promise.all(presenceIds.map(id => db.ref(`presence-configs/${id}`).get())),
		Promise.all(statusIds.map(id => db.ref(`status-configs/${id}`).get())),
	])

	const avatarFromUser = userRaw.avatar || userRaw.image || '/logo.png'
	const tagFromUser = String(userRaw.tag ?? '').padStart(4, '0')

	const presenceConfigs = presenceSnaps
		.map((snap, idx) => {
			if (!snap.exists()) return null
			const id = presenceIds[idx]
			const raw = snap.val() as any

			const averageColors: string[] =
				Array.isArray(raw.averageColors) && raw.averageColors.length > 0
					? raw.averageColors
					: raw.averageColor
						? [raw.averageColor]
						: ['#5b5b5b']

			return {
				id,
				title: raw.title || 'Unnamed',
				author: userRaw.name || 'Unknown User',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
				description: raw.description || '',
				averageColors,
				configData: raw.configData || {
					cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
					imageCycles: [],
					buttonPairs: [],
				},
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((cfg): cfg is NonNullable<typeof cfg> => cfg !== null)

	const statusConfigs = statusSnaps
		.map((snap, idx) => {
			if (!snap.exists()) return null
			const id = statusIds[idx]
			const raw = snap.val() as any
			return {
				id,
				title: raw.title || 'Unnamed',
				author: userRaw.name || 'Unknown User',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((st): st is NonNullable<typeof st> => st !== null)

	return {
		user: {
			name: userRaw.name || null,
			avatar: avatarFromUser,
			tag: tagFromUser,
			provider: userRaw.provider || null,
			createdAt: userRaw.createdAt || null,
			lastSeen: userRaw.lastSeen || null,
		},
		presenceConfigs,
		statusConfigs,
	}
}

export async function GET(req: Request) {
	const url = new URL(req.url)
	const username = url.searchParams.get('username') || ''
	const tag = url.searchParams.get('tag') || ''

	if (!username || !tag) {
		return new Response('BadRequest', { status: 400 })
	}

	const session = await auth()
	const currentUserId = session?.user?.id ? String(session.user.id) : null

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

			const resolved = await resolveUserByHandle(username, tag)
			if (!resolved || !resolved.authorId) {
				send('not-found', { username, tag })
				try {
					controller.close()
				} catch {}
				closed = true
				return
			}

			const { authorId } = resolved

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

			const userRef = db.ref(`users/${authorId}`)

			const onValueHandler = async () => {
				if (closed) return
				const next = await loadAuthorConfigsById(authorId)
				if (!next || !next.user) {
					send('not-found', { username, tag })
					return
				}
				send('update', next)
			}

			userRef.on('value', onValueHandler)

			const ping = setInterval(() => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
				} catch {}
			}, 25000)

			req.signal.addEventListener('abort', () => {
				closed = true
				clearInterval(ping)
				userRef.off('value', onValueHandler)
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
