'use client'

import { type Stats } from '@/service/firebase'
import CountUp from '@lib/count-up'
import { useEffect, useState } from 'react'
import styles from './stats.module.scss'

export default function StatsBlock() {
	const [stats, setStats] = useState<Stats>({
		visitors: { count: 0, lastUpdated: 0 },
		downloads: { count: 0, lastUpdated: 0 },
	})
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false

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

		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		const es = new EventSource('/api/v1/analytics/stream')

		const handleMessage = (ev: MessageEvent) => {
			try {
				const data = JSON.parse(ev.data) as Stats
				setStats(data)
				setLoaded(true)
			} catch {}
		}

		es.addEventListener('ready', handleMessage)
		es.addEventListener('update', handleMessage)

		es.onerror = () => {}

		return () => {
			es.removeEventListener('ready', handleMessage)
			es.removeEventListener('update', handleMessage)
			es.close()
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
