import { encryptUserId } from '@/lib/crypto'
import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'
import { auth } from '../../../auth/[...nextauth]/route'

const db = admin.database()

type SyncUserBody = {
	userId: string
	name?: string
	avatar?: string
	tag?: string
	provider?: string
}

type UserRecord = {
	name: string | null
	avatar: string | null
	rawAvatar: string | null
	provider: string | null
	tag: string | null
	createdAt: number | null
	lastSeen: number | null
}

function normalizeTag(tag?: string): string | null {
	if (!tag) return null
	const digitsOnly = tag.replace(/\D/g, '')
	const head = digitsOnly.slice(0, 4)
	return head.padStart(4, '0')
}

const redisKeyForUserProfile = (userId: string) => `user:profile:${userId}`
const USER_CACHE_TTL = 60

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as SyncUserBody

		if (!body?.userId) {
			return NextResponse.json({ ok: false, error: 'MissingUserId' }, { status: 400 })
		}

		const session = await auth()
		const currentUserId = session?.user?.id ? String(session.user.id) : null

		if (!currentUserId || currentUserId !== body.userId) {
			return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
		}

		const { userId, name, avatar, tag, provider } = body
		const userRef = db.ref(`users/${userId}`)
		const rKey = redisKeyForUserProfile(userId)
		const normalizedTag = normalizeTag(tag)
		const now = Date.now()

		let existingUser: UserRecord | null = null
		const cachedUserJson = await redis.get<string>(rKey)

		if (cachedUserJson) {
			try {
				existingUser =
					typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
			} catch {}
		}

		if (!existingUser) {
			const snap = await userRef.get()
			if (snap.exists()) {
				const raw = snap.val() as any
				existingUser = {
					name: raw.name ?? null,
					avatar: raw.avatar ?? null,
					rawAvatar: raw.rawAvatar ?? null,
					provider: raw.provider ?? null,
					tag: raw.tag ?? null,
					createdAt: raw.createdAt ?? null,
					lastSeen: raw.lastSeen ?? null,
				}
			}
		}

		const cleanAvatarUrl = avatar && avatar.trim() ? avatar : (existingUser?.rawAvatar ?? '')
		const encryptedToken = encryptUserId(userId)
		const proxiedAvatarUrl = cleanAvatarUrl
			? `/api/auth/avatars/${encodeURIComponent(encryptedToken)}`
			: '/logo.png'

		const updatedUser: UserRecord = {
			name: name ?? existingUser?.name ?? 'Unknown',
			avatar: proxiedAvatarUrl,
			rawAvatar: cleanAvatarUrl || null,
			provider: provider ?? existingUser?.provider ?? null,
			tag: normalizedTag ?? existingUser?.tag ?? null,
			createdAt: existingUser?.createdAt ?? now,
			lastSeen: now,
		}

		if (existingUser) {
			await userRef.update({
				name: updatedUser.name,
				avatar: updatedUser.avatar,
				rawAvatar: updatedUser.rawAvatar,
				provider: updatedUser.provider,
				tag: updatedUser.tag,
				lastSeen: updatedUser.lastSeen,
			})
		} else {
			await userRef.set(updatedUser)
		}

		await redis.set(rKey, JSON.stringify(updatedUser), { ex: USER_CACHE_TTL })

		return NextResponse.json({ ok: true, created: !existingUser }, { status: 200 })
	} catch {
		return NextResponse.json({ ok: false, error: 'InternalError' }, { status: 500 })
	}
}
