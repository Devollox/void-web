import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = {
	authorId: string
}

export async function GET(_req: Request, ctx: { params: Promise<Params> | Params }) {
	const { authorId } = await ctx.params

	if (!authorId) {
		return NextResponse.json({ ok: false, error: 'MissingAuthorId' }, { status: 400 })
	}

	try {
		const presenceRef = db.ref('presence-configs')
		const statusRef = db.ref('status-configs')
		const userRef = db.ref(`users/${authorId}`)

		const [presenceSnap, statusSnap, userSnap] = await Promise.all([
			presenceRef.get(),
			statusRef.get(),
			userRef.get(),
		])

		const presencesRaw = presenceSnap.exists() ? (presenceSnap.val() as Record<string, any>) : {}
		const statusesRaw = statusSnap.exists() ? (statusSnap.val() as Record<string, any>) : {}
		const userRaw = userSnap.exists() ? (userSnap.val() as Record<string, any>) : null

		const presenceConfigs = Object.entries(presencesRaw)
			.filter(([, raw]) => raw && raw.authorId === authorId)
			.map(([id, raw]) => ({
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || 'Unknown',
				authorId: raw.authorId,
				authorAvatar: raw.authorAvatar || '',
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
				description: raw.description || '',
				averageColor: raw.averageColor || '#5b5b5b',
				configData: raw.configData || {},
				uploadedAt: raw.uploadedAt || 0,
			}))

		const statusConfigs = Object.entries(statusesRaw)
			.filter(([, raw]) => raw && raw.authorId === authorId)
			.map(([id, raw]) => ({
				id,
				title: raw.title || 'Unnamed',
				author: raw.author || 'Unknown',
				authorId: raw.authorId,
				authorAvatar: raw.authorAvatar || '',
				downloads:
					typeof raw.downloads === 'number'
						? raw.downloads
						: parseInt(String(raw.downloads ?? '0')) || 0,
				description: raw.description || '',
				configData: raw.configData || { statusCycles: [] },
				uploadedAt: raw.uploadedAt || 0,
			}))

		return NextResponse.json({
			user: userRaw
				? {
						id: authorId,
						name: userRaw.name || null,
						avatar: userRaw.avatar || userRaw.image || null,
						provider: userRaw.provider || null,
						createdAt: userRaw.createdAt || null,
						lastSeen: userRaw.lastSeen || null,
					}
				: null,
			presenceConfigs,
			statusConfigs,
		})
	} catch (e: any) {
		return NextResponse.json(
			{
				ok: false,
				error: 'InternalError',
				message: e?.message || String(e),
			},
			{ status: 500 }
		)
	}
}
