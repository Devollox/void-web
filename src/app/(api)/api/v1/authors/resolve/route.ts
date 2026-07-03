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

	const [, userRaw] = entry

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

	const presenceConfigs = presenceIds
		.map(id => {
			const raw = presencesRaw[id]
			if (!raw) return null
			return {
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || userRaw?.name || 'Unknown',
				authorAvatar: avatarFromUser,
				authorTag: userRaw.tag,
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
				description: raw.description || '',
				averageColor: raw.averageColor || '#5b5b5b',
				configData: raw.configData || {
					cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
					imageCycles: [],
					buttonPairs: [],
				},
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter(Boolean)

	const statusConfigs = statusIds
		.map(id => {
			const raw = statusesRaw[id]
			if (!raw) return null
			return {
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || userRaw?.name || 'Unknown',
				authorAvatar: avatarFromUser,
				authorTag: userRaw.tag,
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}
		})
		.filter(Boolean)

	return NextResponse.json({
		user: {
			name: userRaw.name || null,
			avatar: avatarFromUser || null,
			tag: String(userRaw.tag ?? '').padStart(4, '0'),
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
	const { username, tag } = (await req.json()) as Body
	return resolveAuthor(username, tag)
}
