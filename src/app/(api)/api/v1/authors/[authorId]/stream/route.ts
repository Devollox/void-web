import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = {
	authorId: string
}

async function loadAuthorConfigs(authorId: string) {
	const userRef = db.ref(`users/${authorId}`)
	const presenceRef = db.ref('presence-configs')
	const statusRef = db.ref('status-configs')

	const [userSnap, presenceSnap, statusSnap] = await Promise.all([
		userRef.get(),
		presenceRef.get(),
		statusRef.get(),
	])

	const userRaw = userSnap.exists() ? (userSnap.val() as any) : null
	const presencesRaw = presenceSnap.exists() ? (presenceSnap.val() as Record<string, any>) : {}
	const statusesRaw = statusSnap.exists() ? (statusSnap.val() as Record<string, any>) : {}

	const presenceMap = (userRaw?.configs?.presence || {}) as Record<string, boolean>
	const statusMap = (userRaw?.configs?.status || {}) as Record<string, boolean>

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const avatarFromUser = userRaw?.avatar || userRaw?.image || ''
	const tagFromUser = userRaw?.tag || userRaw?.authorTag || null

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
				author: raw.author || userRaw?.name || 'Unknown',
				authorId,
				authorAvatar: avatarFromUser,
				authorTag: raw.authorTag || tagFromUser || undefined,
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
				author: raw.author || userRaw?.name || 'Unknown',
				authorId,
				authorAvatar: avatarFromUser,
				authorTag: raw.authorTag || tagFromUser || undefined,
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
					id: authorId,
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

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	const { authorId } = await ctx.params

	if (!authorId) {
		return NextResponse.json({ ok: false, error: 'MissingAuthorId' }, { status: 400 })
	}

	const encoder = new TextEncoder()
	let closed = false

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
			}

			const initial = await loadAuthorConfigs(authorId)
			if (!initial) {
				send('not-found', { authorId })
				controller.close()
				return
			}

			send('ready', initial)

			const userRef = db.ref(`users/${authorId}`)
			const presenceRef = db.ref('presence-configs')
			const statusRef = db.ref('status-configs')

			const onUser = async () => {
				if (closed) return
				const next = await loadAuthorConfigs(authorId)
				send('update', next)
			}

			const onPresence = async () => {
				if (closed) return
				const next = await loadAuthorConfigs(authorId)
				send('update', next)
			}

			const onStatus = async () => {
				if (closed) return
				const next = await loadAuthorConfigs(authorId)
				send('update', next)
			}

			userRef.on('value', onUser)
			presenceRef.on('value', onPresence)
			statusRef.on('value', onStatus)

			const ping = setInterval(() => {
				if (closed) return
				controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
			}, 25000)

			req.signal.addEventListener('abort', () => {
				closed = true
				clearInterval(ping)
				userRef.off('value', onUser)
				presenceRef.off('value', onPresence)
				statusRef.off('value', onStatus)
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
