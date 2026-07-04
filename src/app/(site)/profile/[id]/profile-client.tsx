'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Config, Status } from '@/service/firebase'
import { Search, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import styles from './profile.module.scss'

type UserInfo = {
	name: string | null
	avatar: string | null
	tag: string | null
	provider: string | null
	createdAt: number | null
	lastSeen: number | null
}

type Props = {
	user?: UserInfo | null
	presenceConfigs: Config[]
	statusConfigs: Status[]
	profileTag: string
	username: string
	initialOwnPresenceIds: string[]
	initialOwnStatusIds: string[]
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
	presenceConfigs: (Config & { isOwn?: boolean })[]
	statusConfigs: (Status & { isOwn?: boolean })[]
}

function filterConfigs(configs: Config[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return configs
	return configs.filter(
		config =>
			config.title.toLowerCase().includes(term) || config.description.toLowerCase().includes(term)
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
			status.title.toLowerCase().includes(term) || status.description.toLowerCase().includes(term)
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

export function ProfileClient({
	user,
	presenceConfigs,
	statusConfigs,
	profileTag,
	username,
	initialOwnPresenceIds,
	initialOwnStatusIds,
}: Props) {
	const [searchTerm, setSearchTerm] = useState('')
	const { data: session } = useSession()

	const [liveConfigs, setLiveConfigs] = useState<Config[]>(presenceConfigs)
	const [liveStatuses, setLiveStatuses] = useState<Status[]>(statusConfigs)

	const [ownPresenceIds, setOwnPresenceIds] = useState<Set<string>>(new Set(initialOwnPresenceIds))
	const [ownStatusIds, setOwnStatusIds] = useState<Set<string>>(new Set(initialOwnStatusIds))

	useEffect(() => {
		let cancelled = false
		let es: EventSource | null = null

		function applyOwnIds(next: AuthorConfigsResponse) {
			const presenceIds = new Set(
				(next.presenceConfigs || []).filter(cfg => cfg.isOwn).map(cfg => String(cfg.id))
			)
			const statusIds = new Set(
				(next.statusConfigs || []).filter(cfg => cfg.isOwn).map(cfg => String(cfg.id))
			)
			setOwnPresenceIds(presenceIds)
			setOwnStatusIds(statusIds)
		}

		function startStream() {
			const url = `/api/v1/authors/stream?username=${encodeURIComponent(
				username
			)}&tag=${encodeURIComponent(profileTag)}`

			es = new EventSource(url)

			es.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
				applyOwnIds(next)
			})

			es.addEventListener('update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
				applyOwnIds(next)
			})

			es.addEventListener('not-found', () => {
				if (cancelled) return
				setLiveConfigs([])
				setLiveStatuses([])
				setOwnPresenceIds(new Set())
				setOwnStatusIds(new Set())
			})
		}

		startStream()

		return () => {
			cancelled = true
			es?.close()
		}
	}, [username, profileTag])

	const isOwner =
		!!user &&
		!!session &&
		!!session.user?.id &&
		!!session.user?.name &&
		!!user.name &&
		session.user.name === user.name &&
		session.user.id.startsWith(profileTag)

	useEffect(() => {
		if (!isOwner || !session?.user?.id) return
		let cancelled = false

		async function loadOwnIds() {
			try {
				const res = await fetch(
					`/api/v1/authors/${encodeURIComponent(String(session?.user?.id))}/configs`,
					{
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
					}
				)

				if (!res.ok) return
				const data = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return

				const presenceIds = new Set(
					(data.presenceConfigs || []).map(cfg => String((cfg as any).id))
				)
				const statusIds = new Set((data.statusConfigs || []).map(cfg => String((cfg as any).id)))

				setOwnPresenceIds(presenceIds)
				setOwnStatusIds(statusIds)
			} catch {
				if (cancelled) return
			}
		}

		loadOwnIds()

		return () => {
			cancelled = true
		}
	}, [isOwner, session?.user?.id])

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
					<PresenceGrid
						configs={sortedConfigs}
						loading={false}
						allowDelete={isOwner}
						ownConfigIds={ownPresenceIds}
					/>
					<div style={{ marginTop: '20px' }} />
					<StatusesGrid
						configs={sortedStatuses}
						loading={false}
						allowDelete={isOwner}
						ownStatusIds={ownStatusIds}
					/>
				</div>
			</div>
		</section>
	)
}
