import { redis } from '@/services/redis'
import { NextRequest, NextResponse } from 'next/server'

const WEBHOOK_HEALTH_URL = 'https://webhooks.voidpresence.com/health'
const DISCORD_BOT_ID = process.env.DISCORD_BOT_ID ?? ''
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID ?? ''
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? ''

async function checkWebhook() {
	try {
		const res = await fetch(WEBHOOK_HEALTH_URL, {
			signal: AbortSignal.timeout(5000),
			cache: 'no-store',
		})
		return res.ok
	} catch {
		return false
	}
}

async function checkBot() {
	try {
		const res = await fetch(
			`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${DISCORD_BOT_ID}`,
			{
				headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
				signal: AbortSignal.timeout(5000),
				cache: 'no-store',
			}
		)
		return res.ok
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
