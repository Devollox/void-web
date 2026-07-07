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

const redisKeyForUserCache = (userId: string) => `cache:user:${userId}`
const USER_CACHE_TTL = 60

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as SyncUserBody

		if (!body?.userId) {
			return NextResponse.json({ ok: false, error: 'MissingUserId' }, { status: 400 })
		}

		const session = await auth()
		const currentUserId = session?.user?.id ? String(session.user.id) : null

		if (!currentUserId) {
			return NextResponse.json(
				{ ok: false, error: 'NoSessionUserId', message: 'Missing session.user.id' },
				{ status: 401 }
			)
		}

		if (currentUserId !== body.userId) {
			return NextResponse.json(
				{
					ok: false,
					error: 'Forbidden',
					message: 'You can only sync your own profile',
					currentUserId,
					bodyUserId: body.userId,
				},
				{ status: 403 }
			)
		}

		const { userId, name, avatar, tag, provider } = body
		const userRef = db.ref(`users/${userId}`)
		const rKey = redisKeyForUserCache(userId)

		const normalizedTag = normalizeTag(tag)
		const now = Date.now()

		const cachedUserJson = await redis.get<string>(rKey)
		let existingUser: UserRecord | null = null

		if (cachedUserJson) {
			try {
				existingUser =
					typeof cachedUserJson === 'object'
						? cachedUserJson
						: (JSON.parse(cachedUserJson) as UserRecord)
			} catch {
				existingUser = null
			}
		}

		if (!existingUser) {
			const snap = await userRef.get()
			if (snap.exists()) {
				const raw = snap.val() as any
				existingUser = {
					name: raw.name ?? null,
					avatar: raw.avatar ?? null,
					provider: raw.provider ?? null,
					tag: raw.tag ?? null,
					createdAt: raw.createdAt ?? null,
					lastSeen: raw.lastSeen ?? null,
				}
			}
		}

		const updatedUser: UserRecord = {
			name: name ?? existingUser?.name ?? 'Unknown',
			avatar: avatar ?? existingUser?.avatar ?? '/logo.png',
			provider: provider ?? existingUser?.provider ?? null,
			tag: normalizedTag ?? existingUser?.tag ?? null,
			createdAt: existingUser?.createdAt ?? now,
			lastSeen: now,
		}

		if (existingUser) {
			await userRef.update({
				name: updatedUser.name,
				avatar: updatedUser.avatar,
				provider: updatedUser.provider,
				tag: updatedUser.tag,
				lastSeen: updatedUser.lastSeen,
			})
		} else {
			await userRef.set(updatedUser)
		}

		await redis.set(rKey, JSON.stringify(updatedUser), { ex: USER_CACHE_TTL })

		return NextResponse.json({ ok: true, created: !existingUser }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ ok: false, error: 'InternalError', message }, { status: 500 })
	}
}
