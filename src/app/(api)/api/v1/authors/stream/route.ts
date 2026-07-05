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

async function loadAuthorConfigsByHandle(
	username: string,
	tag: string
): Promise<AuthorConfigs | null> {
	const resolved = await resolveUserByHandle(username, tag)
	if (!resolved) return null

	const { authorId, userRaw } = resolved

	const presenceRef = db.ref('presence-configs')
	const statusRef = db.ref('status-configs')

	const [presenceSnap, statusSnap] = await Promise.all([presenceRef.get(), statusRef.get()])

	const presencesRaw = presenceSnap.exists() ? (presenceSnap.val() as Record<string, any>) : {}
	const statusesRaw = statusSnap.exists() ? (statusSnap.val() as Record<string, any>) : {}

	const presenceMap = (userRaw?.configs?.presence || {}) as Record<string, boolean>
	const statusMap = (userRaw?.configs?.status || {}) as Record<string, boolean>

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const avatarFromUser = userRaw?.avatar || userRaw?.image || ''
	const tagFromUser = String(userRaw?.tag ?? '').padStart(4, '0')

	const presenceConfigs = presenceIds
		.map(id => {
			const raw = presencesRaw[id]
			if (!raw) return null

			const averageColors: string[] =
				Array.isArray(raw.averageColors) && raw.averageColors.length > 0
					? raw.averageColors
					: raw.averageColor
						? [raw.averageColor]
						: ['#5b5b5b']

			return {
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || userRaw?.name || username || 'Unknown',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
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

	const statusConfigs = statusIds
		.map(id => {
			const raw = statusesRaw[id]
			if (!raw) return null
			return {
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || userRaw?.name || username || 'Unknown',
				authorAvatar: avatarFromUser,
				authorTag: tagFromUser,
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter((st): st is NonNullable<typeof st> => st !== null)

	return {
		user: userRaw
			? {
					name: userRaw.name || null,
					avatar: avatarFromUser || null,
					tag: tagFromUser,
					provider: userRaw.provider || null,
					createdAt: userRaw.createdAt || null,
					lastSeen: userRaw.lastSeen || null,
				}
			: null,
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
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
			}

			const initial = await loadAuthorConfigsByHandle(username, tag)
			if (!initial || !initial.user) {
				send('not-found', { username, tag })
				controller.close()
				closed = true
				return
			}

			send('ready', initial)

			const resolved = await resolveUserByHandle(username, tag)
			if (!resolved) {
				send('not-found', { username, tag })
				controller.close()
				closed = true
				return
			}

			const { authorId } = resolved

			const userRef = db.ref(`users/${authorId}`)
			const presenceRef = db.ref('presence-configs')
			const statusRef = db.ref('status-configs')

			const onAnyChange = async () => {
				if (closed) return
				const next = await loadAuthorConfigsByHandle(username, tag)
				if (!next || !next.user) {
					send('not-found', { username, tag })
					return
				}
				send('update', next)
			}

			userRef.on('value', onAnyChange)
			presenceRef.on('value', onAnyChange)
			statusRef.on('value', onAnyChange)

			const ping = setInterval(() => {
				if (closed) return
				controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
			}, 25000)

			req.signal.addEventListener('abort', () => {
				if (closed) return
				closed = true
				clearInterval(ping)
				userRef.off('value', onAnyChange)
				presenceRef.off('value', onAnyChange)
				statusRef.off('value', onAnyChange)
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
