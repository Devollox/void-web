import { decryptUserId } from '@/lib/crypto'
import { admin } from '@/services/firebase-admin'
import { redis } from '@/services/redis'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = { userId: string }

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { userId: encryptedToken } = 'then' in ctx.params ? await ctx.params : ctx.params

		if (!encryptedToken) {
			return new NextResponse('Bad request.', { status: 400 })
		}

		const userId = decryptUserId(decodeURIComponent(encryptedToken))
		if (!userId) {
			return NextResponse.redirect(new URL('/logo.png', req.url), 302)
		}

		let realDiscordAvatarUrl: string | null = null
		const cachedUserJson = await redis.get<string>(`cache:user:${userId}`)

		if (cachedUserJson) {
			try {
				const parsed =
					typeof cachedUserJson === 'object' ? cachedUserJson : JSON.parse(cachedUserJson)
				realDiscordAvatarUrl = parsed?.rawAvatar || null
			} catch {}
		}

		if (!realDiscordAvatarUrl) {
			const snap = await db.ref(`users/${userId}`).get()
			if (snap.exists()) {
				const user = snap.val()
				realDiscordAvatarUrl = user?.rawAvatar || user?.image || null
			}
		}

		if (!realDiscordAvatarUrl || realDiscordAvatarUrl.startsWith('/api/auth/avatars')) {
			return NextResponse.redirect(new URL('/logo.png', req.url), 302)
		}

		const res = await fetch(realDiscordAvatarUrl, {
			signal: AbortSignal.timeout(5000),
		})

		if (!res.ok || !res.body) {
			return NextResponse.redirect(new URL('/logo.png', req.url), 302)
		}

		return new NextResponse(res.body as any, {
			status: 200,
			headers: {
				'Content-Type': res.headers.get('content-type') || 'image/png',
				'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
			},
		})
	} catch {
		return NextResponse.redirect(new URL('/logo.png', req.url), 302)
	}
}
