import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'

const db = admin.database()

type Body = {
	username: string
	tag: string
	configId?: string
}

const REDIS_TTL = 60

async function resolveAuthor(username: string, tag: string, configId?: string) {
	if (!username || !tag) {
		return NextResponse.json({ ok: false, error: 'BadRequest' }, { status: 400 })
	}

	const usersSnap = await db.ref('users').get()
	if (!usersSnap.exists()) {
		return NextResponse.json({ ok: false, error: 'NotFound' }, { status: 404 })
	}

	const users = usersSnap.val() as Record<string, any>

	const entry = Object.entries(users).find(
		([, u]) =>
			u.name === username && String(u.tag ?? '').padStart(4, '0') === String(tag).padStart(4, '0')
	)

	if (!entry) {
		return NextResponse.json({ ok: false, error: 'NotFound' }, { status: 404 })
	}

	const [authorId, userRaw] = entry

	const avatarFromUser = userRaw?.avatar || userRaw?.image || '/logo.png'
	const tagFromUser = String(userRaw.tag ?? '').padStart(4, '0')

	await redis.set(
		`cache:user:${authorId}`,
		JSON.stringify({
			name: userRaw.name ?? null,
			avatar: userRaw.avatar ?? userRaw.image ?? null,
			provider: userRaw.provider ?? null,
			tag: userRaw.tag ?? null,
			createdAt: userRaw.createdAt ?? null,
			lastSeen: userRaw.lastSeen ?? null,
			configs: userRaw.configs ?? null,
		}),
		{ ex: REDIS_TTL }
	)

	const presenceMap = userRaw?.configs?.presence || {}
	const statusMap = userRaw?.configs?.status || {}

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	if (!configId) {
		const [presenceSnaps, statusSnaps] = await Promise.all([
			Promise.all(presenceIds.map((id: string) => db.ref(`presence-configs/${id}`).get())),
			Promise.all(statusIds.map((id: string) => db.ref(`status-configs/${id}`).get())),
		])

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

		return NextResponse.json({
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
		})
	}

	const presenceSnap = await db.ref(`presence-configs/${configId}`).get()
	const statusSnap = await db.ref(`status-configs/${configId}`).get()

	const presenceSingle = presenceSnap.exists() ? presenceSnap.val() : null
	const statusSingle = statusSnap.exists() ? statusSnap.val() : null

	const extraPresence =
		presenceSingle && String(presenceSingle.authorId || '') === String(authorId)
			? {
					id: configId,
					title: presenceSingle.title || 'Unnamed',
					author: userRaw.name || 'Unknown User',
					authorAvatar: avatarFromUser,
					authorTag: tagFromUser,
					downloads: typeof presenceSingle.downloads === 'number' ? presenceSingle.downloads : 0,
					description: presenceSingle.description || '',
					averageColors:
						Array.isArray(presenceSingle.averageColors) && presenceSingle.averageColors.length > 0
							? presenceSingle.averageColors
							: presenceSingle.averageColor
								? [presenceSingle.averageColor]
								: ['#5b5b5b'],
					configData: presenceSingle.configData || {
						cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
						imageCycles: [],
						buttonPairs: [],
					},
					uploadedAt: presenceSingle.uploadedAt || 0,
				}
			: null

	const extraStatus =
		statusSingle && String(statusSingle.authorId || '') === String(authorId)
			? {
					id: configId,
					title: statusSingle.title || 'Unnamed',
					author: userRaw.name || 'Unknown User',
					authorAvatar: avatarFromUser,
					authorTag: tagFromUser,
					downloads: typeof statusSingle.downloads === 'number' ? statusSingle.downloads : 0,
					description: statusSingle.description || '',
					configData: statusSingle.configData || { statusCycles: [] },
					uploadedAt: statusSingle.uploadedAt || 0,
				}
			: null

	return NextResponse.json({
		user: {
			name: userRaw.name || null,
			avatar: avatarFromUser,
			tag: tagFromUser,
			provider: userRaw.provider || null,
			createdAt: userRaw.createdAt || null,
			lastSeen: userRaw.lastSeen || null,
		},
		presenceConfigs: extraPresence ? [extraPresence] : [],
		statusConfigs: extraStatus ? [extraStatus] : [],
	})
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const username = searchParams.get('username') || ''
	const tag = searchParams.get('tag') || ''
	const configId = searchParams.get('configId') || undefined
	return resolveAuthor(username, tag, configId)
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Body
		const username = body?.username || ''
		const tag = body?.tag || ''
		const configId = body?.configId || undefined
		return await resolveAuthor(username, tag, configId)
	} catch {
		return NextResponse.json({ ok: false, error: 'InvalidJSON' }, { status: 400 })
	}
}
