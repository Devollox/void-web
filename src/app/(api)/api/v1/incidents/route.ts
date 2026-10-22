import { redis } from '@/services/redis'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

export type IncidentService = 'webhook' | 'bot' | 'all'

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export interface Incident {
	id: string
	ts: string
	resolvedAt?: string
	service: IncidentService
	status: IncidentStatus
	description: string
}

export async function GET() {
	const raw = await redis.lrange<string>('incidents', 0, 19)

	const incidents: Incident[] = raw.map(e => {
		try {
			return typeof e === 'string' ? (JSON.parse(e) as Incident) : (e as Incident)
		} catch {
			return e as unknown as Incident
		}
	})

	return NextResponse.json({ incidents })
}

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = (await req.json()) as Partial<Incident>

	if (!body.description || !body.service || !body.status) {
		return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
	}

	const incident: Incident = {
		id: crypto.randomUUID(),
		ts: body.ts ?? new Date().toISOString(),
		service: body.service,
		status: body.status,
		description: body.description,
		resolvedAt:
			body.resolvedAt ?? (body.status === 'resolved' ? new Date().toISOString() : undefined),
	}

	await redis.lpush('incidents', JSON.stringify(incident))
	await redis.ltrim('incidents', 0, 49)

	return NextResponse.json({ ok: true, incident })
}

export async function PATCH(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = (await req.json()) as {
		id: string
		status: Incident['status']
		description?: string
	}

	if (!body.id || !body.status) {
		return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
	}

	const raw = await redis.lrange<string>('incidents', 0, 49)
	const incidents = raw.map(e => {
		try {
			return typeof e === 'string' ? (JSON.parse(e) as Incident) : (e as Incident)
		} catch {
			return e as unknown as Incident
		}
	})

	const idx = incidents.findIndex(i => i.id === body.id)
	if (idx === -1) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	incidents[idx] = {
		id: incidents[idx]!.id,
		ts: incidents[idx]!.ts,
		service: incidents[idx]!.service,
		status: body.status,
		description: body.description ?? incidents[idx]!.description,
		resolvedAt: body.status === 'resolved' ? new Date().toISOString() : incidents[idx]!.resolvedAt,
	}

	await redis.del('incidents')
	if (incidents.length > 0) {
		await redis.rpush('incidents', ...incidents.map(i => JSON.stringify(i)))
	}

	return NextResponse.json({ ok: true, incident: incidents[idx] ?? null })
}
