import { redis } from '@/services/redis'
import { NextRequest, NextResponse } from 'next/server'

const WEBHOOK_HEALTH_URL = 'https://webhooks.voidpresence.com/health'

async function checkWebhook() {
	try {
		const res = await fetch(WEBHOOK_HEALTH_URL, {
			signal: AbortSignal.timeout(10000),
			cache: 'no-store',
		})
		return res.ok
	} catch {
		return false
	}
}

async function checkBot() {
	try {
		const heartbeat = await redis.get<number>('bot:heartbeat')
		if (!heartbeat) return false
		return Date.now() - heartbeat < 5 * 60 * 1000
	} catch {
		return false
	}
}

function getDayKey(date: Date): string {
	return date.toISOString().split('T')[0] ?? ''
}

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const [webhookOk, botOk] = await Promise.all([checkWebhook(), checkBot()])

	const now = new Date()
	const dayKey = getDayKey(now)
	const timestamp = now.toISOString()

	const webhookEntry = JSON.stringify({ ok: webhookOk, ts: timestamp })
	const botEntry = JSON.stringify({ ok: botOk, ts: timestamp })

	await Promise.all([
		redis.lpush(`uptime:webhook:${dayKey}`, webhookEntry),
		redis.ltrim(`uptime:webhook:${dayKey}`, 0, 287),
		redis.expire(`uptime:webhook:${dayKey}`, 60 * 60 * 24 * 92),

		redis.lpush(`uptime:bot:${dayKey}`, botEntry),
		redis.ltrim(`uptime:bot:${dayKey}`, 0, 287),
		redis.expire(`uptime:bot:${dayKey}`, 60 * 60 * 24 * 92),
	])

	return NextResponse.json({
		ok: true,
		webhook: webhookOk,
		bot: botOk,
		timestamp,
	})
}
