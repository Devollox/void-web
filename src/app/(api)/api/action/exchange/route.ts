import { redis } from '@/services/redis'
import {
	ACTION_HEADERS,
	ACTION_TICKET_MAX_BODY,
	EXCHANGE_ACTION_SCRIPT,
	getActionTicketKey,
	isActionTicket,
	isRecord,
	type ActionPayload,
} from '@/services/action-ticket'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function invalidGrant() {
	return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers: ACTION_HEADERS })
}

function readActionPayload(value: unknown): ActionPayload | null {
	let parsed: unknown = value

	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value) as unknown
		} catch {
			return null
		}
	}

	if (!isRecord(parsed)) return null

	const kind = parsed.kind
	if (kind !== 'import-config' && kind !== 'import-status' && kind !== 'install-plugin') {
		return null
	}

	if (kind === 'import-config') {
		if (typeof parsed.configId !== 'string' || !parsed.configId) return null
		if (typeof parsed.title !== 'string') return null
		if (!isRecord(parsed.configData)) return null
		return parsed as unknown as ActionPayload
	}

	if (kind === 'import-status') {
		if (typeof parsed.configId !== 'string' || !parsed.configId) return null
		if (typeof parsed.title !== 'string') return null
		if (!isRecord(parsed.configData)) return null
		if (!Array.isArray((parsed.configData as any).statusCycles)) return null
		return parsed as unknown as ActionPayload
	}

	if (kind === 'install-plugin') {
		if (typeof parsed.pluginId !== 'string' || !parsed.pluginId) return null
		if (typeof parsed.title !== 'string') return null
		if (typeof parsed.version !== 'string') return null
		if (typeof parsed.sourceUrl !== 'string' || !parsed.sourceUrl) return null
		if (typeof parsed.isFolder !== 'boolean') return null
		return parsed as unknown as ActionPayload
	}

	return null
}

async function readBody(request: NextRequest): Promise<unknown> {
	const ct = request.headers.get('content-type')?.split(';')[0]?.trim()
	if (ct !== 'application/json') throw new Error('content-type')

	const declared = request.headers.get('content-length')
	if (declared !== null) {
		const n = Number(declared)
		if (!Number.isFinite(n) || n < 0 || n > ACTION_TICKET_MAX_BODY) throw new Error('size')
	}

	const text = await request.text()
	if (Buffer.byteLength(text, 'utf8') > ACTION_TICKET_MAX_BODY) throw new Error('size')

	return JSON.parse(text) as unknown
}

export async function POST(request: NextRequest) {
	let body: unknown
	try {
		body = await readBody(request)
	} catch {
		return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: ACTION_HEADERS })
	}

	if (!isRecord(body)) return invalidGrant()
	if (!isActionTicket(body.ticket)) return invalidGrant()

	try {
		const result = await redis.eval(EXCHANGE_ACTION_SCRIPT, [getActionTicketKey(body.ticket)], [])

		if (result === null || (isRecord(result) && typeof result.err === 'string')) {
			return invalidGrant()
		}

		const payload = readActionPayload(result)
		if (!payload) return invalidGrant()

		return NextResponse.json({ payload }, { headers: ACTION_HEADERS })
	} catch {
		return NextResponse.json(
			{ error: 'temporarily_unavailable' },
			{ status: 503, headers: ACTION_HEADERS }
		)
	}
}
