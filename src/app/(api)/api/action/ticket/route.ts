import { admin } from '@/services/firebase-admin'
import { redis } from '@/services/redis'
import {
	ACTION_HEADERS,
	ACTION_TICKET_MAX_BODY,
	ACTION_TICKET_TTL,
	createActionTicket,
	getActionTicketKey,
	isRecord,
	readImportConfigPayload,
	readImportStatusPayload,
	readInstallPluginPayload,
	SITE_ORIGIN,
	type ActionPayload,
	type ActionTicketRecord,
} from '@/services/action-ticket'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const db = admin.database()

const ALLOWED_KINDS = new Set(['import-config', 'import-status', 'install-plugin'])

function forbidden() {
	return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: ACTION_HEADERS })
}

function badRequest(detail?: string) {
	return NextResponse.json(
		{ error: 'invalid_request', ...(detail ? { detail } : {}) },
		{ status: 400, headers: ACTION_HEADERS }
	)
}

function isSameSite(request: NextRequest): boolean {
	if (request.headers.get('origin') !== SITE_ORIGIN) return false
	const site = request.headers.get('sec-fetch-site')
	return site === null || site === 'same-origin'
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
	if (!isSameSite(request)) return forbidden()

	let body: unknown
	try {
		body = await readBody(request)
	} catch {
		return badRequest('body')
	}

	if (!isRecord(body)) return badRequest('body_shape')

	const kind = body.kind
	if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) return badRequest('kind')

	const id = body.id
	if (typeof id !== 'string' || !id.trim()) return badRequest('id')
	const configId = id.trim().slice(0, 128)

	let payload: ActionPayload | null = null

	try {
		if (kind === 'import-config') {
			const snap = await db.ref(`presence-configs/${configId}`).get()
			if (!snap.exists()) {
				return NextResponse.json({ error: 'not_found' }, { status: 404, headers: ACTION_HEADERS })
			}
			const raw = snap.val() as Record<string, unknown>
			payload = readImportConfigPayload(configId, raw)
		} else if (kind === 'import-status') {
			const snap = await db.ref(`status-configs/${configId}`).get()
			if (!snap.exists()) {
				return NextResponse.json({ error: 'not_found' }, { status: 404, headers: ACTION_HEADERS })
			}
			const raw = snap.val() as Record<string, unknown>
			payload = readImportStatusPayload(configId, raw)
		} else if (kind === 'install-plugin') {
			const snap = await db.ref(`plugin-configs/${configId}`).get()
			if (!snap.exists()) {
				return NextResponse.json({ error: 'not_found' }, { status: 404, headers: ACTION_HEADERS })
			}
			const raw = snap.val() as Record<string, unknown>
			payload = readInstallPluginPayload(configId, raw)
		}
	} catch {
		return NextResponse.json(
			{ error: 'temporarily_unavailable' },
			{ status: 503, headers: ACTION_HEADERS }
		)
	}

	if (!payload) {
		return NextResponse.json({ error: 'not_found' }, { status: 404, headers: ACTION_HEADERS })
	}

	const ticket = createActionTicket()

	const record: ActionTicketRecord = {
		version: 1,
		purpose: 'action-ticket',
		kind: payload.kind,
		expiresAt: Date.now() + ACTION_TICKET_TTL * 1000,
		payload,
	}

	try {
		const result = await redis.set(getActionTicketKey(ticket), JSON.stringify(record), {
			ex: ACTION_TICKET_TTL,
			nx: true,
		})

		if (result !== 'OK') {
			return NextResponse.json(
				{ error: 'temporarily_unavailable' },
				{ status: 503, headers: ACTION_HEADERS }
			)
		}
	} catch {
		return NextResponse.json(
			{ error: 'temporarily_unavailable' },
			{ status: 503, headers: ACTION_HEADERS }
		)
	}

	const deepLink = new URL('voidpresence://action')
	deepLink.searchParams.set('ticket', ticket)

	return NextResponse.json(
		{
			ticket,
			deepLink: deepLink.toString(),
			expiresIn: ACTION_TICKET_TTL,
		},
		{ headers: ACTION_HEADERS }
	)
}
