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
	type DesktopTicketRecord,
} from '@/services/desktop-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
	if (!isSameSiteRequest(request)) {
		return NextResponse.json(
			{ error: 'forbidden' },
			{
				status: 403,
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	}

	let body: unknown

	try {
		body = await readJsonBody(request)
	} catch {
		return NextResponse.json(
			{ error: 'invalid_request' },
			{
				status: 400,
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	}

	const binding = readBinding(body)

	if (!binding) {
		return NextResponse.json(
			{ error: 'invalid_request' },
			{
				status: 400,
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	}

	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json(
				{ error: 'unauthorized' },
				{
					status: 401,
					headers: DESKTOP_AUTH_HEADERS,
				}
			)
		}

		const user = session.user
		const authorId =
			typeof user.id === 'string' || typeof user.id === 'number' ? String(user.id).trim() : ''

		if (!authorId) {
			return NextResponse.json(
				{ error: 'profile_unavailable' },
				{
					status: 403,
					headers: DESKTOP_AUTH_HEADERS,
				}
			)
		}

		const ticket = createTicket()

		const record: DesktopTicketRecord = {
			version: 1,
			purpose: 'desktop-connect',
			state: binding.state,
			codeChallenge: binding.codeChallenge,
			expiresAt: Date.now() + DESKTOP_TICKET_TTL * 1000,
			profile: {
				authorId,
				authorName: cleanText(user.name),
				provider: cleanText(user.provider),
				avatar: getAvatarUrl(user.image),
			},
		}

		const result = await redis.set(getTicketKey(ticket), JSON.stringify(record), {
			ex: DESKTOP_TICKET_TTL,
			nx: true,
		})

		if (result !== 'OK') {
			return NextResponse.json(
				{ error: 'temporarily_unavailable' },
				{
					status: 503,
					headers: DESKTOP_AUTH_HEADERS,
				}
			)
		}

		const deepLink = new URL('voidpresence://auth')

		deepLink.searchParams.set('ticket', ticket)
		deepLink.searchParams.set('state', binding.state)

		return NextResponse.json(
			{
				ticket,
				state: binding.state,
				deepLink: deepLink.toString(),
				expiresIn: DESKTOP_TICKET_TTL,
			},
			{
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	} catch {
		return NextResponse.json(
			{ error: 'temporarily_unavailable' },
			{
				status: 503,
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	}
}
