'use client'

import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Status } from '@service/firebase'
import { Search, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import styles from './statuses.module.scss'

export type Props = {
	initialStatuses?: Status[]
	initialSearchTerm: string
	initialOwnStatusIds?: string[]
}

export function filterStatuses(statuses: Status[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return statuses
	return statuses.filter(
		status =>
			status.title.toLowerCase().includes(term) ||
			status.author.toLowerCase().includes(term) ||
			status.description.toLowerCase().includes(term)
	)
}

export function sortStatuses(statuses: Status[]) {
	return [...statuses].sort((a, b) => {
		const aDownloads =
			typeof a.downloads === 'number' ? a.downloads : parseInt(String(a.downloads ?? '0')) || 0
		const bDownloads =
			typeof b.downloads === 'number' ? b.downloads : parseInt(String(b.downloads ?? '0')) || 0

		return bDownloads - aDownloads
	})
}

type AuthorStatusesResponse = {
	user: {
		id: string
		name: string | null
		avatar: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: any[]
	statusConfigs: Status[]
}

export function StatusClient({
	initialStatuses = [],
	initialSearchTerm,
	initialOwnStatusIds = [],
}: Props) {
	const [statuses, setStatuses] = useState<Status[]>(initialStatuses)
	const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '')
	const [loading, setLoading] = useState(initialStatuses.length === 0)

	const { data: session } = useSession()
	const [ownStatusIds, setOwnStatusIds] = useState<Set<string>>(new Set(initialOwnStatusIds))

	useEffect(() => {
		let cancelled = false

		async function loadOwnStatuses() {
			const userId = session?.user?.id ? String(session.user.id) : ''
			if (!userId) return

			try {
				const res = await fetch(`/api/v1/authors/${encodeURIComponent(userId)}/configs`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!res.ok) return
				const data = (await res.json()) as AuthorStatusesResponse
				if (cancelled) return

				const ids = new Set<string>((data.statusConfigs || []).map(cfg => String((cfg as any).id)))
				setOwnStatusIds(ids)
			} catch {
				if (cancelled) return
			}
		}

		loadOwnStatuses()

		return () => {
			cancelled = true
		}
	}, [session?.user?.id])

	useEffect(() => {
		let cancelled = false
		let eventSource: EventSource | null = null
		let hideLoadingTimeout: NodeJS.Timeout | null = null

		function safeSetLoadingFalse() {
			if (hideLoadingTimeout) clearTimeout(hideLoadingTimeout)
			hideLoadingTimeout = setTimeout(() => {
				if (!cancelled) setLoading(false)
			}, 200)
		}

		async function loadInitialStatuses() {
			if (initialStatuses.length > 0) {
				setStatuses(initialStatuses)
				safeSetLoadingFalse()
				return true
			}

			try {
				const res = await fetch('/api/v1/configs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ kind: 'status' }),
				})

				if (!res.ok) {
					if (!cancelled) setStatuses([])
					safeSetLoadingFalse()
					return false
				}

				const data = (await res.json()) as Status[]
				if (!cancelled) setStatuses(data)
				safeSetLoadingFalse()
				return true
			} catch {
				if (!cancelled) setStatuses([])
				safeSetLoadingFalse()
				return false
			}
		}

		async function startStream() {
			const ok = await loadInitialStatuses()
			if (!ok || cancelled) return

			eventSource = new EventSource('/api/v1/configs/stream?kind=status')

			eventSource.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Status[]
				setStatuses(next)
			})

			eventSource.addEventListener('update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Status[]
				setStatuses(next)
			})

			eventSource.addEventListener('not-found', () => {
				if (cancelled) return
				setStatuses([])
			})
		}

		startStream()

		return () => {
			cancelled = true
			eventSource?.close()
			if (hideLoadingTimeout) clearTimeout(hideLoadingTimeout)
		}
	}, [initialStatuses])

	const filteredStatuses = useMemo(
		() => filterStatuses(statuses, searchTerm),
		[statuses, searchTerm]
	)
	const sortedStatuses = useMemo(() => sortStatuses(filteredStatuses), [filteredStatuses])

	const canDeleteAnything = !!session?.user?.id

	return (
		<>
			<div className={styles.themes_left_side}>
				<form className={styles.search_container} onSubmit={e => e.preventDefault()}>
					<Search className={styles.search_icon} />
					<input
						className={styles.search}
						type='text'
						placeholder='Search by title, author or description...'
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
					<span>{sortedStatuses.length} statuses found</span>
				</div>
			</div>

			<div className={styles.themes_right_side}>
				<StatusesGrid
					configs={sortedStatuses}
					loading={loading}
					allowDelete={canDeleteAnything}
					ownStatusIds={ownStatusIds}
				/>
			</div>
		</>
	)
}
