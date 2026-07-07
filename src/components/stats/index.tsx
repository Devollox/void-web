'use client'

import { type Stats } from '@/service/firebase'
import CountUp from '@lib/count-up'
import { useEffect, useState } from 'react'
import styles from './stats.module.scss'

const DEFAULT_STATS: Stats = {
	visitors: { count: 0, lastUpdated: 0 },
	downloads: { count: 0, lastUpdated: 0 },
}

export default function StatsBlock() {
	const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
	const [loaded, setLoaded] = useState(false)

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
		const es = new EventSource('/api/v1/analytics/stream')

		const handleUpdate = (ev: MessageEvent) => {
			try {
				const data = JSON.parse(ev.data) as Partial<Stats> | Stats

				setStats(prev => {
					const next: Stats = {
						downloads: {
							count:
								typeof data.downloads?.count === 'number'
									? data.downloads.count
									: prev.downloads.count,
							lastUpdated:
								typeof data.downloads?.lastUpdated === 'number'
									? data.downloads.lastUpdated
									: prev.downloads.lastUpdated,
						},
						visitors: {
							count:
								typeof data.visitors?.count === 'number'
									? data.visitors.count
									: prev.visitors.count,
							lastUpdated:
								typeof data.visitors?.lastUpdated === 'number'
									? data.visitors.lastUpdated
									: prev.visitors.lastUpdated,
						},
					}

					if (
						typeof next.downloads.count === 'number' &&
						typeof next.visitors.count === 'number' &&
						!loaded
					) {
						setLoaded(true)
					}

					return next
				})
			} catch {}
		}

		es.addEventListener('update', handleUpdate)
		es.onerror = () => {}

		return () => {
			es.removeEventListener('update', handleUpdate)
			es.close()
		}
	}, [loaded])

	const downloadsCount = stats?.downloads?.count ?? 0
	const visitorsCount = stats?.visitors?.count ?? 0

	return (
		<div className={styles.downloads_container}>
			<strong>{loaded ? <CountUp to={downloadsCount} duration={2.5} /> : <span>0</span>}</strong>
			<span> Downloads</span>

			<strong>{loaded ? <CountUp to={visitorsCount} duration={2.5} /> : <span>0</span>}</strong>
			<span> Visitors</span>
		</div>
	)
}
