'use client'

import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Status } from '@/services/firebase'
import { db } from '@/services/firebase'
import { onValue, ref } from 'firebase/database'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './statuses.module.scss'

export type Props = {
	initialStatuses: Status[]
	initialSearchTerm: string
	initialTotal: number
	initialLimit: number
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

export function StatusClient({
	initialStatuses,
	initialSearchTerm,
	initialTotal,
	initialLimit,
}: Props) {
	const [statuses, setStatuses] = useState<Status[]>(initialStatuses)
	const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '')
	const [limit] = useState(initialLimit)
	const [offset, setOffset] = useState(initialStatuses.length)
	const [loadingFirst, setLoadingFirst] = useState(initialStatuses.length === 0)
	const [hasMore, setHasMore] = useState(initialStatuses.length < initialTotal)
	const [loadingMore, setLoadingMore] = useState(false)

	const sentinelRef = useRef<HTMLDivElement | null>(null)
	const isFetchingRef = useRef(false)
	const statusesRef = useRef<Status[]>(initialStatuses)
	const lastFetchTsRef = useRef<number>(0)

	useEffect(() => {
		statusesRef.current = statuses
	}, [statuses])

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value)
	}, [])

	const handleClearSearch = useCallback(() => {
		setSearchTerm('')
	}, [])

	const setTopStatuses = useCallback(
		(items: Status[], totalFromServer: number) => {
			setStatuses(items)

			setHasMore(items.length < totalFromServer && items.length > 0 && items.length >= limit)
		},
		[limit]
	)

	const mergeStatuses = useCallback(
		(items: Status[], totalFromServer?: number) => {
			setStatuses(prev => {
				const byId = new Map(prev.map(s => [s.id, s]))
				for (const item of items) {
					byId.set(item.id, item)
				}
				const merged = Array.from(byId.values())
				if (typeof totalFromServer === 'number') {
					setHasMore(merged.length < totalFromServer && items.length > 0 && items.length >= limit)
				}
				return merged
			})
		},
		[limit]
	)

	const loadMore = useCallback(async () => {
		if (!hasMore || isFetchingRef.current) return
		isFetchingRef.current = true
		setLoadingMore(true)

		try {
			const res = await fetch('/api/v1/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					kind: 'status',
					offset,
					limit,
				}),
			})

			if (!res.ok) {
				return
			}

			const data = (await res.json()) as {
				items: Status[]
				total: number
				offset: number
				limit: number
			}

			if (!data.items || data.items.length === 0) {
				setHasMore(false)
				return
			}

			mergeStatuses(data.items, data.total)
			setOffset(prev => prev + data.items.length)
			if (data.items.length < limit) {
				setHasMore(false)
			}
		} finally {
			setLoadingMore(false)
			isFetchingRef.current = false
			if (loadingFirst) setLoadingFirst(false)
		}
	}, [offset, limit, hasMore, loadingFirst, mergeStatuses])

	useEffect(() => {
		if (!sentinelRef.current) return
		const elem = sentinelRef.current

		const observer = new IntersectionObserver(
			entries => {
				const entry = entries[0]
				if (entry?.isIntersecting) {
					loadMore()
				}
			},
			{
				root: null,
				rootMargin: '0px 0px 50% 0px',
				threshold: 0,
			}
		)

		observer.observe(elem)

		return () => {
			observer.disconnect()
		}
	}, [loadMore])

	useEffect(() => {
		let cancelled = false

		const refetchStatusById = async (statusId: string) => {
			const now = Date.now()
			if (now - lastFetchTsRef.current < 250) {
				return
			}
			lastFetchTsRef.current = now

			try {
				const res = await fetch(`/api/v1/configs/${statusId}?kind=status`, {
					method: 'GET',
				})
				if (!res.ok) return
				const next = (await res.json()) as Status
				if (cancelled) return

				setStatuses(prev =>
					prev.map(s =>
						s.id === statusId
							? {
									...s,
									downloads: next.downloads,
									title: next.title,
									description: next.description,
								}
							: s
					)
				)
			} catch {}
		}

		const refetchTopStatuses = async () => {
			const now = Date.now()
			if (now - lastFetchTsRef.current < 250) {
				return
			}
			lastFetchTsRef.current = now

			try {
				const res = await fetch('/api/v1/configs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						kind: 'status',
						offset: 0,
						limit,
					}),
				})
				if (!res.ok) return
				const data = (await res.json()) as {
					items: Status[]
					total: number
					offset: number
					limit: number
				}
				if (cancelled) return
				if (!data.items || data.items.length === 0) return

				setTopStatuses(data.items, data.total)
				setOffset(data.items.length)
				if (data.items.length < limit) {
					setHasMore(false)
				}
				setLoadingFirst(false)
			} catch {}
		}

		const activityRef = ref(db, 'activity')

		const unsubscribe = onValue(activityRef, snapshot => {
			if (cancelled) return

			const val = snapshot.val() as {
				configs?: { ts: number; kind: string; configId: string; type: string }
				downloads?: { ts: number; kind: string; configId: string; downloads: number }
				profiles?: { ts: number; kind: string; configId?: string }
			} | null

			if (!val) return
			const now = Date.now()

			const configsPing = val.configs
			const downloadsPing = val.downloads

			const isFresh = (ts?: number) => typeof ts === 'number' && now - ts <= 10000

			const configId = downloadsPing?.configId || configsPing?.configId || undefined
			const configsKind = configsPing?.kind
			const configsType = configsPing?.type
			const downloadsKind = downloadsPing?.kind

			const belongsToList = !!configId && statusesRef.current.some(s => s.id === configId)

			const isStatusDownload =
				downloadsPing &&
				isFresh(downloadsPing.ts) &&
				downloadsKind === 'status_download' &&
				!!configId &&
				belongsToList

			const isStatusCreated =
				configsPing &&
				isFresh(configsPing.ts) &&
				configsKind === 'created' &&
				configsType === 'status'

			const isStatusDeleted =
				configsPing &&
				isFresh(configsPing.ts) &&
				configsKind === 'deleted' &&
				configsType === 'status'

			if (!isStatusDownload && !isStatusCreated && !isStatusDeleted) {
				return
			}

			if (isStatusDownload && configId) {
				refetchStatusById(configId)
				return
			}

			if (isStatusCreated) {
				refetchTopStatuses()
				return
			}

			if (isStatusDeleted && configId) {
				if (!belongsToList) {
					refetchTopStatuses()
					return
				}
				setStatuses(prev => prev.filter(s => s.id !== configId))
				return
			}
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [limit, mergeStatuses, setTopStatuses])

	const filteredStatuses = useMemo(
		() => filterStatuses(statuses, searchTerm),
		[statuses, searchTerm]
	)
	const sortedStatuses = useMemo(() => sortStatuses(filteredStatuses), [filteredStatuses])

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
						onChange={e => handleSearchChange(e.target.value)}
					/>
					{searchTerm && (
						<button type='button' className={styles.search_clear_btn} onClick={handleClearSearch}>
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
					loading={loadingFirst && !statuses.length}
					hasMore={hasMore}
					loadingMore={loadingMore}
				/>
				<div ref={sentinelRef} className={styles.infinite_scroll_sentinel} />
			</div>
		</>
	)
}
