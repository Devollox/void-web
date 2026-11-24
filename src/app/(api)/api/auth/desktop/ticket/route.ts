import { auth } from '@api/auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/services/redis'
import {
	cleanText,
	createTicket,
	DESKTOP_AUTH_HEADERS,
	DESKTOP_TICKET_TTL,
	getAvatarUrl,
	getTicketKey,
	isSameSiteRequest,
	readBinding,
	readJsonBody,
} from '@/services/desktop-auth'
import {
	DESKTOP_ATTEMPT_TTL,
	getAttemptKey,
	type DesktopAttemptRecord,
	type TrackedDesktopTicketRecord,
} from '@/services/desktop-attempt'

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

	const binding = readBinding(body)

	if (!binding) {
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
			return respond({ error: 'profile_unavailable' }, 403)
		}

		const ticket = createTicket()
		const attemptId = createTicket()
		const expiresAt = Date.now() + DESKTOP_TICKET_TTL * 1000

		const attempt: DesktopAttemptRecord = {
			version: 1,
			purpose: 'desktop-connect-status',
			authorId,
			status: 'pending',
			expiresAt,
		}

		const record: TrackedDesktopTicketRecord = {
			version: 1,
			purpose: 'desktop-connect',
			state: binding.state,
			codeChallenge: binding.codeChallenge,
			expiresAt,
			attemptId,
			profile: {
				authorId,
				authorName: cleanText(user.name),
				provider: cleanText(user.provider),
				avatar: getAvatarUrl(user.image),
			},
		}

		const attemptResult = await redis.set(getAttemptKey(attemptId), JSON.stringify(attempt), {
			ex: DESKTOP_ATTEMPT_TTL,
			nx: true,
		})

		if (attemptResult !== 'OK') {
			return respond({ error: 'temporarily_unavailable' }, 503)
		}

		const ticketResult = await redis.set(getTicketKey(ticket), JSON.stringify(record), {
			ex: DESKTOP_TICKET_TTL,
			nx: true,
		})

		if (ticketResult !== 'OK') {
			return respond({ error: 'temporarily_unavailable' }, 503)
		}

		const deepLink = new URL('voidpresence://auth')

		deepLink.searchParams.set('ticket', ticket)
		deepLink.searchParams.set('state', binding.state)

		return respond({
			ticket,
			state: binding.state,
			deepLink: deepLink.toString(),
			expiresIn: DESKTOP_TICKET_TTL,
			attemptId,
		})
	} catch {
		return respond({ error: 'temporarily_unavailable' }, 503)
	}
}
