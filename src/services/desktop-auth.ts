import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

export const SITE_URL = 'https://voidpresence.com'
export const DESKTOP_CONNECT_PATH = '/api/auth/desktop/connect'
export const DESKTOP_TICKET_TTL = 60

export const DESKTOP_AUTH_HEADERS = {
	'Cache-Control': 'no-store',
	'Referrer-Policy': 'no-referrer',
	Pragma: 'no-cache',
}

export interface DesktopBinding {
	state: string
	codeChallenge: string
}

export interface DesktopProfile {
	authorId: string
	authorName: string
	provider: string
	avatar: string
}

export interface DesktopTicketRecord {
	version: 1
	purpose: 'desktop-connect'
	state: string
	codeChallenge: string
	expiresAt: number
	profile: DesktopProfile
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function cleanText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

export function isState(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value)
}

export function isChallenge(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function isVerifier(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(value)
}

export function isTicket(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function readBinding(value: unknown): DesktopBinding | null {
	if (!isRecord(value)) return null
	if (!isState(value.state)) return null
	if (!isChallenge(value.code_challenge)) return null
	if (value.code_challenge_method !== 'S256') return null

	return {
		state: value.state,
		codeChallenge: value.code_challenge,
	}
}

export function readBindingFromSearch(params: URLSearchParams): DesktopBinding | null {
	const keys = ['state', 'code_challenge', 'code_challenge_method']

	if (keys.some(key => params.getAll(key).length !== 1)) {
		return null
	}

	return readBinding({
		state: params.get('state'),
		code_challenge: params.get('code_challenge'),
		code_challenge_method: params.get('code_challenge_method'),
	})
}

export function appendBinding(url: URL, binding: DesktopBinding): URL {
	url.searchParams.set('state', binding.state)
	url.searchParams.set('code_challenge', binding.codeChallenge)
	url.searchParams.set('code_challenge_method', 'S256')

	return url
}

export function createTicket(): string {
	return randomBytes(32).toString('base64url')
}

export function getTicketKey(ticket: string): string {
	const hash = createHash('sha256').update(ticket).digest('hex')

	return `desktop:connect:ticket:${hash}`
}

export function getCodeChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url')
}

export function getAvatarUrl(value: unknown): string {
	const raw = cleanText(value)

	if (!raw) return ''

	try {
		const url = new URL(raw)

		if (url.protocol !== 'https:') return ''
		if (url.hostname !== 'cdn.discordapp.com') return ''
		if (url.username || url.password || url.port) return ''

		return url.href
	} catch {
		return ''
	}
}

export function isSameSiteRequest(request: Request): boolean {
	if (request.headers.get('origin') !== SITE_URL) return false

	const fetchSite = request.headers.get('sec-fetch-site')

	return fetchSite === null || fetchSite === 'same-origin'
}

export async function readJsonBody(request: Request): Promise<unknown> {
	const contentType = request.headers.get('content-type')?.split(';')[0]?.trim()

	if (contentType !== 'application/json') {
		throw new Error('Invalid content type')
	}

	const declaredLength = request.headers.get('content-length')

	if (declaredLength !== null) {
		const size = Number(declaredLength)

		if (!Number.isFinite(size) || size < 0 || size > 4096) {
			throw new Error('Invalid body size')
		}
	}

	const text = await request.text()

	if (Buffer.byteLength(text, 'utf8') > 4096) {
		throw new Error('Invalid body size')
	}

	return JSON.parse(text) as unknown
}
