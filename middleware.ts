import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
	const url = req.nextUrl
	const hostname = req.headers.get('host') || ''
	const origin = req.headers.get('origin') || ''
	const method = req.method

	const isDev = hostname.includes('localhost')

	const allowedOrigins = ['https://voidpresence.com', 'http://localhost:3000']

	const isAllowedOrigin = origin ? allowedOrigins.includes(origin) : true
	const isApiSubdomain = hostname.startsWith('api.')

	if (isApiSubdomain) {
		if (origin && !isAllowedOrigin) {
			return new NextResponse('CORS Policy: Origin not allowed', { status: 403 })
		}

		if (method === 'OPTIONS') {
			const response = new NextResponse(null, { status: 204 })
			if (origin) {
				response.headers.set('Access-Control-Allow-Origin', origin)
				response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
				response.headers.set(
					'Access-Control-Allow-Headers',
					'Content-Type, Authorization, Cookie, Origin, X-Requested-With, x-auth-return-redirect'
				)
				response.headers.set('Access-Control-Allow-Credentials', 'true')
			}
			return response
		}

		const path = url.pathname

		url.pathname = `/api${path}`
		const response = NextResponse.rewrite(url)

		if (origin) {
			response.headers.set('Access-Control-Allow-Origin', origin)
			response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
			response.headers.set(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, Cookie, Origin, X-Requested-With, x-auth-return-redirect'
			)
			response.headers.set('Access-Control-Allow-Credentials', 'true')
		}
		return response
	}

	const isMainDomainApiCall =
		url.pathname.startsWith('/api') && !url.pathname.startsWith('/api/auth')

	if (isMainDomainApiCall) {
		const cleanPath = url.pathname.replace(/^\/api/, '')
		const searchParams = url.search

		const targetHost = isDev ? 'api.localhost:3000' : 'api.voidpresence.com'
		const protocol = isDev ? 'http' : 'https'

		const apiSubdomainUrl = `${protocol}://${targetHost}${cleanPath}${searchParams}`
		const response = NextResponse.redirect(new URL(apiSubdomainUrl, req.url))

		if (origin && isAllowedOrigin) {
			response.headers.set('Access-Control-Allow-Origin', origin)
			response.headers.set('Access-Control-Allow-Credentials', 'true')
		}
		return response
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt).*)'],
}
