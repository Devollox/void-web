import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/services/redis'
import {
	DESKTOP_AUTH_HEADERS,
	getCodeChallenge,
	getTicketKey,
	isRecord,
	isState,
	isTicket,
	isVerifier,
	readJsonBody,
	type DesktopProfile,
} from '@/services/desktop-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EXCHANGE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])

if not raw then
  return nil
end

local ok, record = pcall(cjson.decode, raw)

if not ok or type(record) ~= 'table' then
  return nil
end

if record.version ~= 1 or record.purpose ~= 'desktop-connect' then
  return nil
end

if record.state ~= ARGV[1] then
  return nil
end

if record.codeChallenge ~= ARGV[2] then
  return nil
end

local now = redis.call('TIME')
local nowMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if type(record.expiresAt) ~= 'number' or record.expiresAt <= nowMs then
  return nil
end

if type(record.profile) ~= 'table' then
  return nil
end

if type(record.profile.authorId) ~= 'string' or record.profile.authorId == '' then
  return nil
end

local profile = cjson.encode(record.profile)

redis.call('DEL', KEYS[1])

return profile
`

function invalidGrant() {
	return NextResponse.json(
		{ error: 'invalid_grant' },
		{
			status: 400,
			headers: DESKTOP_AUTH_HEADERS,
		}
	)
}

function readProfile(value: unknown): DesktopProfile | null {
	let parsed: unknown = value

	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value) as unknown
		} catch {
			return null
		}
	}

	if (!isRecord(parsed)) return null
	if (typeof parsed.authorId !== 'string' || !parsed.authorId) return null
	if (typeof parsed.authorName !== 'string') return null
	if (typeof parsed.provider !== 'string') return null
	if (typeof parsed.avatar !== 'string') return null

	return {
		authorId: parsed.authorId,
		authorName: parsed.authorName,
		provider: parsed.provider,
		avatar: parsed.avatar,
	}
}

export async function POST(request: NextRequest) {
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

	if (!isRecord(body)) return invalidGrant()
	if (!isTicket(body.ticket)) return invalidGrant()
	if (!isState(body.state)) return invalidGrant()
	if (!isVerifier(body.code_verifier)) return invalidGrant()

	try {
		const result = await redis.eval(
			EXCHANGE_SCRIPT,
			[getTicketKey(body.ticket)],
			[body.state, getCodeChallenge(body.code_verifier)]
		)

		const profile = readProfile(result)

		if (!profile) return invalidGrant()

		return NextResponse.json(
			{ profile },
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
