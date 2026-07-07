'use client'

import { type Stats } from '@/service/firebase'
import CountUp from '@lib/count-up'
import { useEffect, useRef, useState } from 'react'
import styles from './stats.module.scss'

const DEFAULT_STATS: Stats = {
	visitors: { count: 0, lastUpdated: 0 },
	downloads: { count: 0, lastUpdated: 0 },
}

export default function StatsBlock() {
	const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
	const [loaded, setLoaded] = useState(false)
	const pendingRef = useRef<Stats | null>(null)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		async function trackVisitor() {
			try {
				await fetch('/api/v1/analytics/app', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type: 'app_visitors', channel: 'site' }),
				})
			} catch {}
		}

		trackVisitor()
	}, [])

	useEffect(() => {
		const flush = () => {
			if (!pendingRef.current) return
			setStats(pendingRef.current)
			setLoaded(true)
			pendingRef.current = null
			timerRef.current = null
		}

		const scheduleFlush = (nextStats: Stats) => {
			pendingRef.current = nextStats
			if (timerRef.current) return
			timerRef.current = setTimeout(flush, 180)
		}

		const es = new EventSource('/api/v1/analytics/stream')

		const handleMessage = (ev: MessageEvent) => {
			try {
				const data = JSON.parse(ev.data) as Stats
				scheduleFlush(data)
			} catch {}
		}

		es.addEventListener('ready', handleMessage)
		es.addEventListener('update', handleMessage)

		es.onerror = () => {}

		return () => {
			es.removeEventListener('ready', handleMessage)
			es.removeEventListener('update', handleMessage)
			es.close()
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [])

	return (
		<div className={styles.downloads_container}>
			<strong>
				{loaded ? <CountUp to={stats.downloads.count} duration={2.5} /> : <span>0</span>}
			</strong>
			<span> Downloads</span>

			<strong>
				{loaded ? <CountUp to={stats.visitors.count} duration={2.5} /> : <span>0</span>}
			</strong>
			<span> Visitors</span>
		</div>
	)
}
