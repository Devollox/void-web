'use client'

import { type Stats, db, mapRawToStats } from '@/services/firebase'
import CountUp from '@lib/count-up'
import { onValue, ref } from 'firebase/database'
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
		const statsRef = ref(db, 'stats')
		const unsubscribe = onValue(statsRef, snapshot => {
			const raw = snapshot.val() || {}
			const next = mapRawToStats(raw)

			setStats(prev => {
				const merged: Stats = {
					downloads: {
						count:
							typeof next.downloads.count === 'number'
								? next.downloads.count
								: prev.downloads.count,
						lastUpdated:
							typeof next.downloads.lastUpdated === 'number'
								? next.downloads.lastUpdated
								: prev.downloads.lastUpdated,
					},
					visitors: {
						count:
							typeof next.visitors.count === 'number' ? next.visitors.count : prev.visitors.count,
						lastUpdated:
							typeof next.visitors.lastUpdated === 'number'
								? next.visitors.lastUpdated
								: prev.visitors.lastUpdated,
					},
				}

				if (
					!loaded &&
					typeof merged.downloads.count === 'number' &&
					typeof merged.visitors.count === 'number'
				) {
					setLoaded(true)
				}

				return merged
			})
		})

		return () => {
			unsubscribe()
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
