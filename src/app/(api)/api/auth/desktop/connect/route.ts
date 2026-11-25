import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/services/redis'
import { auth } from '@/app/(api)/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DESKTOP_ATTEMPT_TTL = 600

function isState(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value)
}

function isChallenge(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

function readLoopbackRedirect(value: string | null): string | null {
	if (!value) return null

	try {
		const url = new URL(value)

		if (url.protocol !== 'http:') return null
		if (url.hostname !== '127.0.0.1') return null
		if (url.username || url.password) return null
		if (url.pathname !== '/callback') return null
		if (url.search || url.hash) return null

		const port = Number(url.port)

		if (!Number.isInteger(port) || port < 1024 || port > 65535) return null

		return url.href
	} catch {
		return null
	}
}

export async function GET(request: NextRequest) {
	const params = request.nextUrl.searchParams

	const state = params.get('state')
	const codeChallenge = params.get('code_challenge')
	const codeChallengeMethod = params.get('code_challenge_method')
	const redirectUri = params.get('redirect_uri')

	const validatedRedirectUri = readLoopbackRedirect(redirectUri)

	if (
		!state ||
		!isState(state) ||
		!codeChallenge ||
		!isChallenge(codeChallenge) ||
		codeChallengeMethod !== 'S256' ||
		!validatedRedirectUri
	) {
		return NextResponse.redirect(
			new URL('/desktop/connect/error?code=invalid_request', request.nextUrl.origin)
		)
	}

	const session = await auth()

	if (!session?.user) {
		const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin)

		signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search)

		return NextResponse.redirect(signInUrl)
	}

	const authorId = String(session.user.id ?? '').trim()

	if (!authorId) {
		return NextResponse.redirect(
			new URL('/desktop/connect/error?code=unauthorized', request.nextUrl.origin)
		)
	}

	const profile = {
		authorId,
		authorName: String(session.user.name ?? '').trim(),
		provider: 'discord',
		avatar: String(session.user.image ?? '').trim(),
	}

	const ticket = randomBytes(32).toString('base64url')
	const ticketHash = createHash('sha256').update(ticket).digest('hex')

	const attempt = {
		version: 1,
		purpose: 'desktop-connect',
		authorId,
		state,
		codeChallenge,
		redirectUri: validatedRedirectUri,
		status: 'pending',
		profile,
		expiresAt: Date.now() + DESKTOP_ATTEMPT_TTL * 1000,
	}

	await redis.set(`desktop:connect:ticket:${ticketHash}`, JSON.stringify(attempt), {
		ex: DESKTOP_ATTEMPT_TTL,
	})

	const callbackUrl = new URL(validatedRedirectUri)

	callbackUrl.searchParams.set('ticket', ticket)
	callbackUrl.searchParams.set('state', state)

	return NextResponse.redirect(callbackUrl)
}
