import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/services/redis'
import { auth } from '@/app/(api)/api/auth/[...nextauth]/route'
import {
	DESKTOP_AUTH_HEADERS,
	isRecord,
	isState,
	isTicket,
	isVerifier,
	readJsonBody,
	type DesktopProfile,
} from '@/services/desktop-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function respond(body: unknown, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: DESKTOP_AUTH_HEADERS,
	})
}

function invalidGrant() {
	return respond({ error: 'invalid_grant' }, 400)
}

function isLoopbackRedirect(value: unknown): value is string {
	if (typeof value !== 'string') return false

	try {
		const url = new URL(value)

		return (
			url.protocol === 'http:' &&
			url.hostname === '127.0.0.1' &&
			url.pathname === '/callback' &&
			!url.search &&
			!url.hash &&
			!url.username &&
			!url.password
		)
	} catch {
		return false
	}
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left, 'utf8')
	const rightBuffer = Buffer.from(right, 'utf8')

	if (leftBuffer.length !== rightBuffer.length) return false

	return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function POST(request: NextRequest) {
	let body: unknown

	try {
		body = await readJsonBody(request)
	} catch {
		return respond({ error: 'invalid_request' }, 400)
	}

	if (!isRecord(body)) return invalidGrant()
	if (!isTicket(body.ticket)) return invalidGrant()
	if (!isState(body.state)) return invalidGrant()
	if (!isVerifier(body.code_verifier)) return invalidGrant()
	if (!isLoopbackRedirect(body.redirect_uri)) return invalidGrant()

	try {
		const session = await auth()

		if (!session?.user) {
			return respond({ error: 'unauthorized' }, 401)
		}

		const authorId = String(session.user.id ?? '').trim()

		if (!authorId) {
			return respond({ error: 'forbidden' }, 403)
		}

		const ticketHash = createHash('sha256').update(body.ticket).digest('hex')

		const ticketKey = `desktop:connect:ticket:${ticketHash}`
		const raw = await redis.get<string>(ticketKey)

		if (typeof raw !== 'string' || !raw) return invalidGrant()

		let attempt: unknown

		try {
			attempt = JSON.parse(raw)
		} catch {
			return invalidGrant()
		}

		if (!isRecord(attempt)) return invalidGrant()

		if (
			attempt.version !== 1 ||
			attempt.purpose !== 'desktop-connect' ||
			attempt.status !== 'pending' ||
			attempt.authorId !== authorId ||
			!isState(attempt.state) ||
			typeof attempt.codeChallenge !== 'string' ||
			!isLoopbackRedirect(attempt.redirectUri)
		) {
			return invalidGrant()
		}

		if (!safeEqual(body.state, attempt.state)) {
			return invalidGrant()
		}

		if (attempt.redirectUri !== body.redirect_uri) {
			return invalidGrant()
		}

		const expectedChallenge = createHash('sha256').update(body.code_verifier).digest('base64url')

		if (!safeEqual(expectedChallenge, attempt.codeChallenge)) {
			return invalidGrant()
		}

		await redis.del(ticketKey)

		const profile: DesktopProfile = {
			authorId,
			authorName: String(session.user.name ?? '').trim(),
			provider: 'discord',
			avatar: String(session.user.image ?? '').trim(),
		}

		return respond({ profile })
	} catch {
		return respond({ error: 'temporarily_unavailable' }, 503)
	}
}
