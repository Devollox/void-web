'use client'

import { onStatsChange, type Stats } from '@/service/firebase'
import CountUp from '@lib/count-up'
import { useEffect, useState } from 'react'
import styles from './stats.module.scss'

export default function Stats() {
	const [stats, setStats] = useState<Stats>({
		visitors: { count: 0, lastUpdated: 0 },
		downloads: { count: 0, lastUpdated: 0 },
	})

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

		const unsubscribe = onStatsChange(next => {
			setStats(next)
			setLoaded(true)
		})

		return unsubscribe
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
