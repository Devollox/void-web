import { auth } from '@api/auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'
import {
	appendBinding,
	DESKTOP_AUTH_HEADERS,
	DESKTOP_CONNECT_PATH,
	readBindingFromSearch,
	SITE_URL,
} from '@/services/desktop-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
	const binding = readBindingFromSearch(request.nextUrl.searchParams)

	if (!binding) {
		return NextResponse.json(
			{
				error: 'invalid_request',
				message: 'Start the connection from the desktop app.',
			},
			{
				status: 400,
				headers: DESKTOP_AUTH_HEADERS,
			}
		)
	}

	const session = await auth()

	if (!session?.user) {
		const callbackUrl = appendBinding(new URL(DESKTOP_CONNECT_PATH, SITE_URL), binding)
		const signInUrl = new URL('/signin', SITE_URL)

		signInUrl.searchParams.set('callbackUrl', callbackUrl.toString())

		return NextResponse.redirect(signInUrl, {
			headers: DESKTOP_AUTH_HEADERS,
		})
	}

	const profileUrl = appendBinding(new URL('/profile', SITE_URL), binding)

	profileUrl.searchParams.set('desktop', 'connect')

	return NextResponse.redirect(profileUrl, {
		headers: DESKTOP_AUTH_HEADERS,
	})
}
