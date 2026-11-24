import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
	'https://voidpresence.com',
	...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
])

const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'
const CORS_HEADERS = 'Content-Type, Authorization, X-Requested-With, x-auth-return-redirect'

function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
	response.headers.append('Vary', 'Origin')

	if (origin && ALLOWED_ORIGINS.has(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin)
		response.headers.set('Access-Control-Allow-Methods', CORS_METHODS)
		response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS)
		response.headers.set('Access-Control-Allow-Credentials', 'true')
	}

	return response
}

export function middleware(req: NextRequest) {
	const url = req.nextUrl.clone()
	const hostname = req.nextUrl.hostname.toLowerCase()
	const origin = req.headers.get('origin') || ''
	const method = req.method

	const isDev =
		process.env.NODE_ENV !== 'production' &&
		(hostname === 'localhost' || hostname.endsWith('.localhost'))

	const isAllowedOrigin = !origin || ALLOWED_ORIGINS.has(origin)

	const isApiSubdomain =
		hostname === 'api.voidpresence.com' || (isDev && hostname === 'api.localhost')

	const isWebhookSubdomain =
		hostname === 'webhooks.voidpresence.com' || (isDev && hostname === 'webhooks.localhost')

	const isStatusSubdomain =
		hostname === 'status.voidpresence.com' || (isDev && hostname === 'status.localhost')

	const isWebhookPath = url.pathname === '/webhooks'

	if (!isWebhookSubdomain && isWebhookPath) {
		const webhookUrl = isDev
			? new URL('http://localhost:3000/webhooks')
			: new URL('https://webhooks.voidpresence.com')

		if (!isDev) {
			return NextResponse.redirect(webhookUrl, 307)
		}
	}

	if (isStatusSubdomain) {
		const pathname = url.pathname

		if (pathname.startsWith('/api/')) {
			const cleanPath = pathname.replace(/^\/api/, '')
			const targetHost = isDev ? 'api.localhost:3000' : 'api.voidpresence.com'
			const protocol = isDev ? 'http' : 'https'

			return NextResponse.rewrite(new URL(`${protocol}://${targetHost}${cleanPath}${url.search}`))
		}

		url.pathname = `/status${pathname === '/' ? '' : pathname}`

		return NextResponse.rewrite(url)
	}

	if (isApiSubdomain) {
		if (!isAllowedOrigin) {
			return addCorsHeaders(
				NextResponse.json(
					{ error: 'origin_not_allowed' },
					{
						status: 403,
						headers: { 'Cache-Control': 'no-store' },
					}
				),
				origin
			)
		}

		if (method === 'OPTIONS') {
			return addCorsHeaders(
				new NextResponse(null, {
					status: 204,
					headers: { 'Cache-Control': 'no-store' },
				}),
				origin
			)
		}

		const pathname = url.pathname

		if (pathname !== '/api' && !pathname.startsWith('/api/')) {
			url.pathname = `/api${pathname}`
		}

		return addCorsHeaders(NextResponse.rewrite(url), origin)
	}

	const isActionApiCall = url.pathname === '/api/action' || url.pathname.startsWith('/api/action/')

	if (isActionApiCall) {
		return NextResponse.next()
	}

	const isAuthApiCall = url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')

	const isMainDomainApiCall =
		(url.pathname === '/api' || url.pathname.startsWith('/api/')) && !isAuthApiCall

	if (isMainDomainApiCall) {
		const cleanPath = url.pathname.replace(/^\/api/, '') || '/'
		const targetHost = isDev ? 'api.localhost:3000' : 'api.voidpresence.com'
		const protocol = isDev ? 'http' : 'https'

		return addCorsHeaders(
			NextResponse.redirect(new URL(`${protocol}://${targetHost}${cleanPath}${url.search}`), 307),
			origin
		)
	}

	const isStatusPath = url.pathname === '/status' || url.pathname.startsWith('/status/')

	if (isStatusPath) {
		const subPath = url.pathname.replace(/^\/status/, '') || '/'
		const statusUrl = isDev
			? new URL(`http://localhost:3001${subPath}${url.search}`)
			: new URL(`https://status.voidpresence.com${subPath}${url.search}`)

		return NextResponse.redirect(statusUrl, 307)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt).*)'],
}
