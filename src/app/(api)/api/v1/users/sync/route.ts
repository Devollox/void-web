import { auth } from '@/lib/auth'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

type SyncUserBody = {
	userId: string
	name?: string
	avatar?: string
	tag?: string
	provider?: string
}

function normalizeTag(tag?: string): string | null {
	if (!tag) return null
	const digitsOnly = tag.replace(/\D/g, '')
	const head = digitsOnly.slice(0, 4)
	return head.padStart(4, '0')
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as SyncUserBody

		if (!body?.userId) {
			return NextResponse.json({ ok: false, error: 'MissingUserId' }, { status: 400 })
		}

		const session = await auth()
		const currentUserId = session?.user?.id ? String(session.user.id) : null

		if (!currentUserId || currentUserId !== body.userId) {
			return NextResponse.json(
				{ ok: false, error: 'Forbidden', message: 'You can only sync your own profile' },
				{ status: 403 }
			)
		}

		const { userId, name, avatar, tag, provider } = body
		const userRef = db.ref(`users/${userId}`)
		const snap = await userRef.get()

		const normalizedTag = normalizeTag(tag)

		if (snap.exists()) {
			await userRef.update({
				...(name ? { name } : {}),
				...(avatar ? { avatar } : {}),
				...(normalizedTag ? { tag: normalizedTag } : {}),
				...(provider ? { provider } : {}),
				lastSeen: Date.now(),
			})

			return NextResponse.json({ ok: true, created: false }, { status: 200 })
		}

		await userRef.set({
			name: name ?? 'Unknown',
			avatar: avatar || '/logo.png',
			provider: provider || null,
			tag: normalizedTag,
			createdAt: Date.now(),
			lastSeen: Date.now(),
		})

		return NextResponse.json({ ok: true, created: true }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ ok: false, error: 'InternalError', message }, { status: 500 })
	}
}
