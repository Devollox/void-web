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
import {
	DESKTOP_ATTEMPT_TTL,
	getAttemptKey,
	parseStoredJson,
	readTicketAttemptId,
} from '@/services/desktop-attempt'

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

if record.attemptId ~= ARGV[3] then
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

if type(record.profile.authorName) ~= 'string' then
  return nil
end

if type(record.profile.provider) ~= 'string' then
  return nil
end

if type(record.profile.avatar) ~= 'string' then
  return nil
end

local attemptRaw = redis.call('GET', KEYS[2])

if not attemptRaw then
  return nil
end

local attemptOk, attempt = pcall(cjson.decode, attemptRaw)

if not attemptOk or type(attempt) ~= 'table' then
  return nil
end

if attempt.version ~= 1 or attempt.purpose ~= 'desktop-connect-status' then
  return nil
end

if attempt.authorId ~= record.profile.authorId then
  return nil
end

if attempt.status ~= 'pending' then
  return nil
end

if type(attempt.expiresAt) ~= 'number' or attempt.expiresAt <= nowMs then
  return nil
end

attempt.status = 'exchanged'

local profile = cjson.encode(record.profile)
local updatedAttempt = cjson.encode(attempt)

redis.call('SET', KEYS[2], updatedAttempt, 'EX', ARGV[4])
redis.call('DEL', KEYS[1])

return profile
`

function respond(body: unknown, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: DESKTOP_AUTH_HEADERS,
	})
}

function invalidGrant() {
	return respond({ error: 'invalid_grant' }, 400)
}

function readProfile(value: unknown): DesktopProfile | null {
	const parsed = parseStoredJson(value)

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
		return respond({ error: 'invalid_request' }, 400)
	}

	if (!isRecord(body)) return invalidGrant()
	if (!isTicket(body.ticket)) return invalidGrant()
	if (!isState(body.state)) return invalidGrant()
	if (!isVerifier(body.code_verifier)) return invalidGrant()

	try {
		const ticketKey = getTicketKey(body.ticket)
		const rawRecord = await redis.get(ticketKey)
		const attemptId = readTicketAttemptId(rawRecord)

		if (!attemptId) return invalidGrant()

		const result = await redis.eval(
			EXCHANGE_SCRIPT,
			[ticketKey, getAttemptKey(attemptId)],
			[body.state, getCodeChallenge(body.code_verifier), attemptId, String(DESKTOP_ATTEMPT_TTL)]
		)

		const profile = readProfile(result)

		if (!profile) return invalidGrant()

		return respond({ profile })
	} catch {
		return respond({ error: 'temporarily_unavailable' }, 503)
	}
}
