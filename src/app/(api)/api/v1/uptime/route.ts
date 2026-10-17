import { redis } from '@/services/redis'
import { NextResponse } from 'next/server'

export const revalidate = 60

type DayData = {
	date: string
	uptime: number
	total: number
	ok: number
}

type ServiceUptime = {
	days: DayData[]
	uptimeLast30: number
	current: boolean
}

function getDayKey(date: Date): string {
	return date.toISOString().split('T')[0] ?? ''
}

async function getServiceUptime(service: string): Promise<ServiceUptime> {
	const days: DayData[] = []
	const now = new Date()

	const keys: string[] = []
	for (let i = 89; i >= 0; i--) {
		const d = new Date(now)
		d.setDate(d.getDate() - i)
		keys.push(`uptime:${service}:${getDayKey(d)}`)
	}

	const results = await Promise.all(keys.map(key => redis.lrange<string>(key, 0, -1)))

	for (let i = 0; i < 90; i++) {
		const d = new Date(now)
		d.setDate(d.getDate() - (89 - i))
		const date = getDayKey(d)
		const entries = results[i] ?? []

		if (entries.length === 0) {
			days.push({ date, uptime: -1, total: 0, ok: 0 })
			continue
		}

		const parsed = entries.map(e => {
			try {
				return typeof e === 'string' ? (JSON.parse(e) as { ok: boolean }) : (e as { ok: boolean })
			} catch {
				return { ok: false }
			}
		})

		const ok = parsed.filter(e => e.ok).length
		const total = parsed.length
		days.push({ date, uptime: Math.round((ok / total) * 100), total, ok })
	}

	const last30 = days.slice(-30).filter(d => d.total > 0)
	const uptimeLast30 =
		last30.length === 0
			? 100
			: Math.round(last30.reduce((acc, d) => acc + d.uptime, 0) / last30.length)

	const todayEntries = results[89] ?? []
	const lastEntry = todayEntries[0]
	let current = true
	if (lastEntry) {
		try {
			const parsed =
				typeof lastEntry === 'string'
					? (JSON.parse(lastEntry) as { ok: boolean })
					: (lastEntry as { ok: boolean })
			current = parsed.ok
		} catch {
			current = true
		}
	}

	return { days, uptimeLast30, current }
}

export async function GET() {
	const [webhook, bot] = await Promise.all([getServiceUptime('webhook'), getServiceUptime('bot')])

	return NextResponse.json({ webhook, bot })
}
