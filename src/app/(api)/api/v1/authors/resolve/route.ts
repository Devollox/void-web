import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

type Body = {
	username: string
	tag: string
}

async function resolveAuthor(username: string, tag: string) {
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
	const presenceMap = userRaw?.configs?.presence || {}
	const statusMap = userRaw?.configs?.status || {}

	const presenceIds = Object.keys(presenceMap).filter(id => presenceMap[id])
	const statusIds = Object.keys(statusMap).filter(id => statusMap[id])

	const [presenceSnaps, statusSnaps] = await Promise.all([
		Promise.all(presenceIds.map(id => db.ref(`presence-configs/${id}`).get())),
		Promise.all(statusIds.map(id => db.ref(`status-configs/${id}`).get())),
	])

	const avatarFromUser = userRaw?.avatar || userRaw?.image || '/logo.png'
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
				authorId,
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
				authorId,
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

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const username = searchParams.get('username') || ''
	const tag = searchParams.get('tag') || ''
	return resolveAuthor(username, tag)
}

export async function POST(req: Request) {
	const body = (await req.json()) as Body
	const username = body?.username || ''
	const tag = body?.tag || ''
	return resolveAuthor(username, tag)
}
