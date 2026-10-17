'use client'

import { useEffect, useState } from 'react'
import styles from './uptime-chart.module.scss'

interface DayData {
	date: string
	uptime: number
	total: number
	ok: number
}

interface ServiceUptime {
	days: DayData[]
	uptimeLast30: number
	current: boolean
}

interface UptimeData {
	webhook: ServiceUptime
	bot: ServiceUptime
}

function getBarClass(day: DayData) {
	if (day.total === 0) return styles.bar_no_data
	if (day.uptime >= 99) return styles.bar_operational
	if (day.uptime >= 80) return styles.bar_degraded
	return styles.bar_down
}

function getUptimeClass(uptime: number) {
	if (uptime >= 99) return styles.service_uptime_good
	if (uptime >= 80) return styles.service_uptime_warn
	return styles.service_uptime_bad
}

function formatDate(dateStr: string) {
	const d = new Date(dateStr)
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ServiceRow({ name, data }: { name: string; data: ServiceUptime | null }) {
	const isLoading = data === null

	return (
		<div className={styles.service_card}>
			<div className={styles.service_header}>
				<div className={styles.service_meta}>
					<span
						className={[
							styles.status_dot,
							isLoading
								? styles.status_dot_loading
								: data.current
									? styles.status_dot_operational
									: styles.status_dot_down,
						].join(' ')}
					/>
					<span className={styles.service_name}>{name}</span>
					{!isLoading && (
						<span className={[styles.service_uptime, getUptimeClass(data.uptimeLast30)].join(' ')}>
							{data.uptimeLast30}%
						</span>
					)}
				</div>

				<span
					className={[
						styles.status_badge,
						isLoading
							? styles.status_badge_loading
							: data.current
								? styles.status_badge_operational
								: styles.status_badge_down,
					].join(' ')}
				>
					{isLoading ? 'Checking…' : data.current ? 'Operational' : 'Down'}
				</span>
			</div>

			<div className={styles.bar_chart}>
				{isLoading
					? Array.from({ length: 90 }).map((_, i) => (
							<div key={i} className={[styles.bar, styles.bar_loading].join(' ')} />
						))
					: data.days.map(day => (
							<div
								key={day.date}
								className={[styles.bar, getBarClass(day)].join(' ')}
								title={
									day.total === 0
										? `${formatDate(day.date)} — no data`
										: `${formatDate(day.date)} — ${day.uptime}% uptime`
								}
							/>
						))}
			</div>

			<div className={styles.bar_chart_footer}>
				<span className={styles.bar_chart_label}>90 days ago</span>
				<span className={styles.bar_chart_label}>Today</span>
			</div>
		</div>
	)
}

export function UptimeChart() {
	const [data, setData] = useState<UptimeData | null>(null)

	useEffect(() => {
		fetch('/api/v1/uptime')
			.then(r => r.json() as Promise<UptimeData>)
			.then(d => setData(d))
			.catch(() => {})
	}, [])

	const overall =
		data === null
			? 'loading'
			: data.webhook.current && data.bot.current
				? 'operational'
				: !data.webhook.current && !data.bot.current
					? 'down'
					: 'degraded'

	return (
		<div className={styles.services}>
			<div
				className={[
					styles.overall_banner,
					overall === 'loading'
						? styles.overall_loading
						: overall === 'operational'
							? styles.overall_operational
							: overall === 'degraded'
								? styles.overall_degraded
								: styles.overall_down,
				].join(' ')}
			>
				{overall === 'loading' && 'Checking system status…'}
				{overall === 'operational' && 'All systems operational'}
				{overall === 'degraded' && 'Some systems degraded'}
				{overall === 'down' && 'Service disruption detected'}
			</div>

			<ServiceRow name="Webhook Service" data={data ? data.webhook : null} />
			<ServiceRow name="Discord Bot" data={data ? data.bot : null} />
		</div>
	)
}
