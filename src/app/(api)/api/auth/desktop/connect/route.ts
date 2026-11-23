import { auth } from '@api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://voidpresence.com'
const DESKTOP_CONNECT_PATH = '/auth/desktop/connect'

export async function GET() {
	const session = await auth()

	if (!session?.user) {
		const signInUrl = new URL('/signin', SITE_URL)

		signInUrl.searchParams.set('callbackUrl', new URL(DESKTOP_CONNECT_PATH, SITE_URL).toString())

		return NextResponse.redirect(signInUrl, {
			headers: {
				'Cache-Control': 'no-store',
			},
		})
	}

	const profileUrl = new URL('/profile', SITE_URL)
	profileUrl.searchParams.set('desktop', 'connect')

	return NextResponse.redirect(profileUrl, {
		headers: {
			'Cache-Control': 'no-store',
		},
	})
}
