'use client'

import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Status } from '@service/firebase'
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
	const [total, setTotal] = useState(initialTotal)
	const [limit] = useState(initialLimit)
	const [offset, setOffset] = useState(initialStatuses.length)
	const [loadingFirst, setLoadingFirst] = useState(initialStatuses.length === 0)
	const [hasMore, setHasMore] = useState(initialStatuses.length < initialTotal)
	const [loadingMore, setLoadingMore] = useState(false)

	const sentinelRef = useRef<HTMLDivElement | null>(null)
	const isFetchingRef = useRef(false)

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value)
	}, [])

	const handleClearSearch = useCallback(() => {
		setSearchTerm('')
	}, [])

	const mergeStatuses = useCallback(
		(items: Status[], totalFromServer?: number) => {
			setStatuses(prev => {
				const byId = new Map(prev.map(s => [s.id, s]))
				for (const item of items) {
					byId.set(item.id, item)
				}
				const merged = Array.from(byId.values())
				if (typeof totalFromServer === 'number') {
					setTotal(totalFromServer)
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
				if (entry.isIntersecting) {
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
		const es = new EventSource('/api/v1/configs/stream?kind=status')

		es.addEventListener('created', async e => {
			const { kind } = JSON.parse((e as MessageEvent).data) as {
				id: string
				kind: 'status' | 'presence'
			}

			if (kind !== 'status') return

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

				if (!data.items || data.items.length === 0) return

				mergeStatuses(data.items, data.total)
				setOffset(data.items.length)
				if (data.items.length < limit) {
					setHasMore(false)
				}
				setLoadingFirst(false)
			} catch {}
		})

		es.addEventListener('deleted', e => {
			const { id, kind } = JSON.parse((e as MessageEvent).data) as {
				id: string
				kind: 'status' | 'presence'
			}

			if (kind !== 'status') return

			setStatuses(prev => prev.filter(s => s.id !== id))
			setTotal(prev => (prev > 0 ? prev - 1 : 0))
		})

		es.addEventListener('downloads', e => {
			const raw = JSON.parse((e as MessageEvent).data) as {
				id: string
				kind: 'status' | 'presence'
				downloads?: number
			}

			if (raw.kind !== 'status') return
			if (typeof raw.downloads !== 'number') return

			const downloads: number = raw.downloads

			setStatuses(prev =>
				prev.map(s =>
					s.id === raw.id
						? {
								...s,
								downloads,
							}
						: s
				)
			)
		})

		es.onerror = () => {}

		return () => {
			es.close()
		}
	}, [limit, mergeStatuses])

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
