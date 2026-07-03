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

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as SyncUserBody

		if (!body?.userId) {
			return NextResponse.json({ ok: false, error: 'MissingUserId' }, { status: 400 })
		}

		const { userId, name, avatar, tag, provider } = body
		const userRef = db.ref(`users/${userId}`)
		const snap = await userRef.get()

		if (snap.exists()) {
			await userRef.update({
				...(name ? { name } : {}),
				...(avatar ? { avatar } : {}),
				...(tag ? { tag } : {}),
				...(provider ? { provider } : {}),
				lastSeen: Date.now(),
			})

			return NextResponse.json({ ok: true, created: false }, { status: 200 })
		}

		await userRef.set({
			name: name ?? 'Unknown',
			avatar: avatar || '/logo.png',
			provider: provider || null,
			tag: tag || null,
			createdAt: Date.now(),
			lastSeen: Date.now(),
		})

		return NextResponse.json({ ok: true, created: true }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ ok: false, error: 'InternalError', message }, { status: 500 })
	}
}
