'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { StatusesGrid } from '@/components/activity-grid/statuses'
import { db, type Config, type Status } from '@/service/firebase'
import { onValue, ref } from 'firebase/database'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './profile.module.scss'

type Props = {
	presenceConfigs: Config[]
	statusConfigs: Status[]
	profileTag: string
	username: string
}

type AuthorConfigsResponse = {
	user: {
		name: string | null
		avatar: string | null
		tag: string | null
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

function sortConfigs(configs: Config[]) {
	return [...configs].sort((a, b) => {
		const aDownloads =
			typeof a.downloads === 'number' ? a.downloads : parseInt(String(a.downloads ?? '0')) || 0
		const bDownloads =
			typeof b.downloads === 'number' ? b.downloads : parseInt(String(b.downloads ?? '0')) || 0
		return bDownloads - aDownloads
	})
}

function filterStatuses(statuses: Status[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return statuses
	return statuses.filter(
		status =>
			status.title.toLowerCase().includes(term) ||
			status.author.toLowerCase().includes(term) ||
			status.description.toLowerCase().includes(term)
	)
}

function sortStatuses(statuses: Status[]) {
	return [...statuses].sort((a, b) => {
		const aDownloads =
			typeof a.downloads === 'number' ? a.downloads : parseInt(String(a.downloads ?? '0')) || 0
		const bDownloads =
			typeof b.downloads === 'number' ? b.downloads : parseInt(String(b.downloads ?? '0')) || 0
		return bDownloads - aDownloads
	})
}

export function ProfileClient({ presenceConfigs, statusConfigs, profileTag, username }: Props) {
	const [searchTerm, setSearchTerm] = useState('')

	const [liveConfigs, setLiveConfigs] = useState<Config[]>(presenceConfigs)
	const [liveStatuses, setLiveStatuses] = useState<Status[]>(statusConfigs)

	const liveConfigsRef = useRef<Config[]>(presenceConfigs)
	const liveStatusesRef = useRef<Status[]>(statusConfigs)
	const lastFetchTsRef = useRef<number>(0)

	useEffect(() => {
		liveConfigsRef.current = liveConfigs
		liveStatusesRef.current = liveStatuses
	}, [liveConfigs, liveStatuses])

	useEffect(() => {
		let cancelled = false

		const refetchAuthorConfigs = async (
			configId?: string,
			type?: 'presence_download' | 'status_download'
		) => {
			const now = Date.now()
			if (now - lastFetchTsRef.current < 250) {
				return
			}
			lastFetchTsRef.current = now

			try {
				const params = new URLSearchParams({
					username,
					tag: profileTag,
				})
				if (configId) {
					params.set('configId', configId)
				}

				const res = await fetch(`/api/v1/authors/resolve?${params.toString()}`, {
					method: 'GET',
					cache: 'no-store',
					headers: { 'Content-Type': 'application/json' },
				})
				if (!res.ok) return
				const next = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return

				if (configId && type === 'presence_download') {
					const nextPresence = next.presenceConfigs || []
					if (nextPresence.length === 0) {
						return
					}
					setLiveConfigs(prev => {
						const without = prev.filter(c => c.id !== configId)
						return [...without, ...nextPresence]
					})
					return
				}

				if (configId && type === 'status_download') {
					const nextStatuses = next.statusConfigs || []
					if (nextStatuses.length === 0) {
						return
					}
					setLiveStatuses(prev => {
						const without = prev.filter(s => s.id !== configId)
						return [...without, ...nextStatuses]
					})
					return
				}

				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
			} catch {}
		}

		const activityRef = ref(db, 'activity')
		const unsubscribe = onValue(activityRef, snapshot => {
			if (cancelled) return

			const val = snapshot.val() as {
				configs?: { ts: number; kind: string; configId: string; type: 'presence' | 'status' }
				downloads?: {
					ts: number
					kind: string
					configId: string
					type: 'presence_download' | 'status_download'
					downloads: number
				}
				profiles?: { ts: number; kind: string; configId?: string }
			} | null

			if (!val) return
			const now = Date.now()

			const configsPing = val.configs
			const downloadsPing = val.downloads
			const profilesPing = val.profiles

			const isFresh = (ts?: number) => typeof ts === 'number' && now - ts <= 10000

			const configId =
				configsPing?.configId || downloadsPing?.configId || profilesPing?.configId || undefined
			const type = downloadsPing?.type || undefined

			const belongsToUser =
				!!configId &&
				(liveConfigsRef.current.some(c => c.id === configId) ||
					liveStatusesRef.current.some(s => s.id === configId))

			const shouldHandleDownloads =
				downloadsPing && isFresh(downloadsPing.ts) && !!configId && belongsToUser
			const shouldHandleConfigs = configsPing && isFresh(configsPing.ts) && !!configId
			const shouldHandleProfiles = profilesPing && isFresh(profilesPing.ts)

			if (!shouldHandleDownloads && !shouldHandleConfigs && !shouldHandleProfiles) {
				return
			}

			if (configId && type === 'presence_download') {
				refetchAuthorConfigs(configId, 'presence_download')
			} else if (configId && type === 'status_download') {
				refetchAuthorConfigs(configId, 'status_download')
			} else {
				refetchAuthorConfigs()
			}
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [username, profileTag])

	const filteredConfigs = useMemo(
		() => filterConfigs(liveConfigs, searchTerm),
		[liveConfigs, searchTerm]
	)
	const sortedConfigs = useMemo(() => sortConfigs(filteredConfigs), [filteredConfigs])

	const filteredStatuses = useMemo(
		() => filterStatuses(liveStatuses, searchTerm),
		[liveStatuses, searchTerm]
	)
	const sortedStatuses = useMemo(() => sortStatuses(filteredStatuses), [filteredStatuses])

	return (
		<section className={styles.section_profile_panel}>
			<div className={styles.profile_container}>
				<div className={styles.themes_left_side}>
					<form className={styles.search_container} onSubmit={e => e.preventDefault()}>
						<Search className={styles.search_icon} />
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

					<div className={styles.stats_summary}>
						<span>{sortedConfigs.length} presence found</span>
					</div>
					<div className={styles.stats_summary}>
						<span>{sortedStatuses.length} statuses found</span>
					</div>
				</div>

				<div className={styles.themes_right_side}>
					<PresenceGrid configs={sortedConfigs} loading={false} allowDelete={false} />
					<div style={{ marginTop: '20px' }} />
					<StatusesGrid configs={sortedStatuses} loading={false} allowDelete={false} />
				</div>
			</div>
		</section>
	)
}
