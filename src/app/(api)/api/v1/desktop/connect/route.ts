import { auth } from '@api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://voidpresence.com'
const DESKTOP_CONNECT_URL = 'https://api.voidpresence.com/desktop/connect'

export async function GET() {
	const session = await auth()

	const profileUrl = new URL('/profile', SITE_URL)
	profileUrl.searchParams.set('desktop', 'connect')

	if (!session?.user) {
		const signInUrl = new URL('/signin', SITE_URL)

		signInUrl.searchParams.set('callbackUrl', DESKTOP_CONNECT_URL)

		return NextResponse.redirect(signInUrl, {
			headers: {
				'Cache-Control': 'no-store',
			},
		})
	}

	return NextResponse.redirect(profileUrl, {
		headers: {
			'Cache-Control': 'no-store',
		},
	})
}
