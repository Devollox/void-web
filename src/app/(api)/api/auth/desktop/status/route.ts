import { auth } from '@api/auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/services/redis'
import {
	DESKTOP_AUTH_HEADERS,
	isRecord,
	isSameSiteRequest,
	isTicket,
	readJsonBody,
} from '@/services/desktop-auth'
import { getAttemptKey, readAttempt } from '@/services/desktop-attempt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function respond(body: unknown, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: DESKTOP_AUTH_HEADERS,
	})
}

export async function POST(request: NextRequest) {
	if (!isSameSiteRequest(request)) {
		return respond({ error: 'forbidden' }, 403)
	}

	let body: unknown

	try {
		body = await readJsonBody(request)
	} catch {
		return respond({ error: 'invalid_request' }, 400)
	}

	if (!isRecord(body) || !isTicket(body.attemptId)) {
		return respond({ error: 'invalid_request' }, 400)
	}

	try {
		const session = await auth()

		if (!session?.user) {
			return respond({ error: 'unauthorized' }, 401)
		}

		const user = session.user

		const authorId =
			typeof user.id === 'string' || typeof user.id === 'number' ? String(user.id).trim() : ''

		if (!authorId) {
			return respond({ error: 'forbidden' }, 403)
		}

		const stored = await redis.get(getAttemptKey(body.attemptId))
		const attempt = readAttempt(stored)

		if (!attempt || attempt.authorId !== authorId) {
			return respond({ error: 'not_found' }, 404)
		}

		if (attempt.status === 'exchanged') {
			return respond({ status: 'exchanged' })
		}

		if (Date.now() >= attempt.expiresAt) {
			return respond({ status: 'expired' })
		}

		return respond({ status: 'pending' })
	} catch {
		return respond({ error: 'temporarily_unavailable' }, 503)
	}
}
