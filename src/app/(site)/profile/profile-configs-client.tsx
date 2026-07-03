'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Config, Status } from '@/service/firebase'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import styles from './profile-configs.module.scss'

type Props = {
	userId: string
	initialConfigs?: Config[]
	initialStatuses?: Status[]
}

type AuthorConfigsResponse = {
	user: {
		id: string
		name: string | null
		avatar: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: Config[]
	statusConfigs: Status[]
}

function filterConfigs(configs: Config[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return configs
	return configs.filter(
		config =>
			config.title.toLowerCase().includes(term) ||
			config.author.toLowerCase().includes(term) ||
			config.description.toLowerCase().includes(term)
	)
}

function filterStatuses(statuses: Status[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return statuses
	return statuses.filter(
		status =>
			status.title.toLowerCase().includes(term) || status.description.toLowerCase().includes(term)
	)
}

export function ProfileConfigsClient({ userId, initialConfigs = [], initialStatuses = [] }: Props) {
	const [searchTerm, setSearchTerm] = useState('')
	const [liveConfigs, setLiveConfigs] = useState<Config[]>(initialConfigs)
	const [liveStatuses, setLiveStatuses] = useState<Status[]>(initialStatuses)
	const [hasLoadedConfigs, setHasLoadedConfigs] = useState(initialConfigs.length > 0)
	const [hasLoadedStatuses, setHasLoadedStatuses] = useState(initialStatuses.length > 0)

	const loadingConfigs = !hasLoadedConfigs
	const loadingStatuses = !hasLoadedStatuses

	useEffect(() => {
		let cancelled = false
		let eventSource: EventSource | null = null
		let hideLoadingTimeoutConfigs: NodeJS.Timeout | null = null
		let hideLoadingTimeoutStatuses: NodeJS.Timeout | null = null

		function finishLoadingConfigs() {
			if (hideLoadingTimeoutConfigs) clearTimeout(hideLoadingTimeoutConfigs)
			hideLoadingTimeoutConfigs = setTimeout(() => {
				if (!cancelled) setHasLoadedConfigs(true)
			}, 100)
		}

		function finishLoadingStatuses() {
			if (hideLoadingTimeoutStatuses) clearTimeout(hideLoadingTimeoutStatuses)
			hideLoadingTimeoutStatuses = setTimeout(() => {
				if (!cancelled) setHasLoadedStatuses(true)
			}, 100)
		}

		async function loadInitialAuthorConfigs() {
			if (initialConfigs.length > 0 || initialStatuses.length > 0) {
				finishLoadingConfigs()
				finishLoadingStatuses()
				return true
			}

			try {
				const res = await fetch(`/api/v1/authors/${encodeURIComponent(String(userId))}/configs`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!res.ok) {
					if (cancelled) return false
					setLiveConfigs([])
					setLiveStatuses([])
					finishLoadingConfigs()
					finishLoadingStatuses()
					return false
				}

				const data = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return false

				setLiveConfigs(data.presenceConfigs || [])
				setLiveStatuses(data.statusConfigs || [])
				finishLoadingConfigs()
				finishLoadingStatuses()
				return true
			} catch {
				if (cancelled) return false
				setLiveConfigs([])
				setLiveStatuses([])
				finishLoadingConfigs()
				finishLoadingStatuses()
				return false
			}
		}

		async function startStream() {
			const ok = await loadInitialAuthorConfigs()
			if (!ok || cancelled) return

			eventSource = new EventSource(`/api/v1/authors/${encodeURIComponent(String(userId))}/stream`)

			eventSource.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
			})

			eventSource.addEventListener('update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
			})

			eventSource.addEventListener('not-found', () => {
				if (cancelled) return
				setLiveConfigs([])
				setLiveStatuses([])
			})
		}

		startStream()

		return () => {
			cancelled = true
			eventSource?.close()
			if (hideLoadingTimeoutConfigs) clearTimeout(hideLoadingTimeoutConfigs)
			if (hideLoadingTimeoutStatuses) clearTimeout(hideLoadingTimeoutStatuses)
		}
	}, [userId, initialConfigs, initialStatuses])

	const filteredConfigs = useMemo(
		() => filterConfigs(liveConfigs, searchTerm),
		[liveConfigs, searchTerm]
	)

	const filteredStatuses = useMemo(
		() => filterStatuses(liveStatuses, searchTerm),
		[liveStatuses, searchTerm]
	)

	return (
		<section className={styles.profile_section}>
			<div className={styles.profile_configs_layout}>
				<div className={styles.profile_header_row}>
					<div className={styles.profile_header_title}>Your configs</div>
				</div>

				<form className={styles.profile_search_container} onSubmit={e => e.preventDefault()}>
					<Search className={styles.profile_search_icon} />
					<input
						className={styles.search}
						type='text'
						placeholder='Search by title or description...'
						name='q'
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
					/>
					{searchTerm && (
						<button
							type='button'
							className={styles.search_clear_btn}
							onClick={() => setSearchTerm('')}
						>
							<X size={16} />
						</button>
					)}
				</form>

				<div className={styles.profile_stats_row}>
					<span>{filteredConfigs.length} presence found</span>
				</div>
				<div className={styles.profile_stats_row}>
					<span>{filteredStatuses.length} statuses found</span>
				</div>

				<div className={styles.themes_right_side}>
					<PresenceGrid configs={filteredConfigs} loading={loadingConfigs} allowDelete={true} />
					<div style={{ marginTop: '20px' }} />
					<StatusesGrid configs={filteredStatuses} loading={loadingStatuses} allowDelete={true} />
				</div>
			</div>
		</section>
	)
}
