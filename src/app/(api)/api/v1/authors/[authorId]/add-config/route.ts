import { admin } from '@/service/firebase-admin'
import { redis } from '@/service/redis'
import { NextResponse } from 'next/server'

const db = admin.database()

type Params = { authorId: string }

type AddConfigBody = {
	kind: 'presence' | 'status'
	title: string
	description: string
	configData: any
	uploadedAt: number
	averageColors?: string[]
}

function getClientIp(req: Request): string {
	const forwardedFor = req.headers.get('x-forwarded-for')
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim()
	}
	return '127.0.0.1'
}

async function checkRateLimit(ip: string) {
	const freqKey = `rl:freq:${ip}`
	const blockKey = `rl:block:${ip}`

	const isBlocked = await redis.get<number>(blockKey)
	if (isBlocked) {
		const ttl = await redis.ttl(blockKey)
		return { blocked: true, remainingMs: ttl * 1000 }
	}

	const requests = await redis.incr(freqKey)
	if (requests === 1) {
		await redis.expire(freqKey, 1)
	}

	if (requests > 5) {
		return { tooFrequent: true }
	}

	return { ok: true }
}

async function checkUserCreateLimit(authorId: string) {
	const key = `rl:create-config:user:${authorId}`
	const count = await redis.incr(key)
	if (count === 1) {
		await redis.expire(key, 60)
	}
	if (count > 10) {
		return { limited: true }
	}
	return { ok: true }
}

async function registerFail(ip: string) {
	const failKey = `rl:fails:${ip}`
	const blockKey = `rl:block:${ip}`

	const fails = await redis.incr(failKey)
	if (fails === 1) {
		await redis.expire(failKey, 60)
	}

	if (fails >= 10) {
		await redis.set(blockKey, 1, { ex: 600 })
		await redis.del(failKey)
	}
}

export async function createPresenceConfig(
	authorId: string,
	body: Omit<AddConfigBody, 'kind'>
): Promise<string> {
	const ref = db.ref('presence-configs').push()
	await ref.set({
		...body,
		authorId,
		downloads: 0,
	})

	const id = ref.key || 'unknown'
	await db.ref(`users/${authorId}/configs/presence/${id}`).set(true)

	await db.ref('activity/configs').set({
		ts: Date.now(),
		kind: 'created',
		configId: id,
		type: 'presence',
	})

	return id
}

export async function createStatusConfig(
	authorId: string,
	body: Omit<AddConfigBody, 'kind'>
): Promise<string> {
	const ref = db.ref('status-configs').push()
	await ref.set({
		...body,
		authorId,
		downloads: 0,
	})

	const id = ref.key || 'unknown'
	await db.ref(`users/${authorId}/configs/status/${id}`).set(true)

	await db.ref('activity/configs').set({
		ts: Date.now(),
		kind: 'created',
		configId: id,
		type: 'status',
	})

	return id
}

export async function POST(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { authorId } = await ctx.params

		if (!authorId) {
			return NextResponse.json(
				{ error: 'MissingAuthorId', message: 'Author id is required in path' },
				{ status: 400 }
			)
		}

		const ip = getClientIp(req)
		const rl = await checkRateLimit(ip)

		if (rl.blocked) {
			return NextResponse.json(
				{
					ok: false,
					error: 'TooManyAttempts',
					message: `Too many invalid requests. Try again in ${Math.ceil(
						(rl.remainingMs ?? 0) / 1000
					)} seconds.`,
				},
				{ status: 429 }
			)
		}

		if (rl.tooFrequent) {
			return NextResponse.json(
				{
					ok: false,
					error: 'TooFrequent',
					message: 'Too many requests. Please wait before trying again.',
				},
				{ status: 429 }
			)
		}

		const userLimit = await checkUserCreateLimit(authorId)
		if (userLimit.limited) {
			return NextResponse.json(
				{
					ok: false,
					error: 'UserLimit',
					message: 'Too many configs created in a short time. Please slow down.',
				},
				{ status: 429 }
			)
		}

		const body = (await req.json()) as AddConfigBody

		if (!body.kind || (body.kind !== 'presence' && body.kind !== 'status')) {
			await registerFail(ip)
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind must be "presence" or "status"' },
				{ status: 400 }
			)
		}

		if (!body.title || !body.configData) {
			await registerFail(ip)
			return NextResponse.json(
				{ error: 'InvalidPayload', message: 'title and configData are required' },
				{ status: 400 }
			)
		}

		const userSnap = await db.ref(`users/${authorId}`).get()
		if (!userSnap.exists()) {
			await registerFail(ip)
			return NextResponse.json(
				{ error: 'AuthorNotFound', message: 'Author does not exist' },
				{ status: 404 }
			)
		}

		if (body.kind === 'presence' && (!body.averageColors || body.averageColors.length === 0)) {
			body.averageColors = ['#5b5b5b']
		}

		const { kind, ...configPayload } = body

		const createdId =
			kind === 'presence'
				? await createPresenceConfig(authorId, configPayload)
				: await createStatusConfig(authorId, configPayload)

		const zKey = kind === 'presence' ? 'stats:presence-downloads' : 'stats:status-downloads'

		try {
			await redis.del(`cache:user:${authorId}`)
			await redis.zadd(zKey, { score: 0, member: createdId })
		} catch {}

		return NextResponse.json({ id: createdId }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
