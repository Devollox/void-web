import { auth } from '@api/auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
	const session = await auth()

	const profileUrl = new URL('/profile', req.url)
	profileUrl.searchParams.set('desktop', 'connect')

	if (!session?.user) {
		const signInUrl = new URL('/api/auth/signin', req.url)

		signInUrl.searchParams.set('callbackUrl', profileUrl.href)

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
