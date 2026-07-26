'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { Config, db } from '@/service/firebase'
import { onValue, ref } from 'firebase/database'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './presence.module.scss'

export type Props = {
	initialConfigs: Config[]
	initialSearchTerm: string
	initialTotal: number
	initialLimit: number
}

export function filterConfigs(configs: Config[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return configs
	return configs.filter(
		config =>
			config.title.toLowerCase().includes(term) ||
			config.author.toLowerCase().includes(term) ||
			config.description.toLowerCase().includes(term)
	)
}

export function sortConfigs(configs: Config[]) {
	return [...configs].sort((a, b) => {
		const aDownloads =
			typeof a.downloads === 'number' ? a.downloads : parseInt(String(a.downloads ?? '0')) || 0
		const bDownloads =
			typeof b.downloads === 'number' ? b.downloads : parseInt(String(b.downloads ?? '0')) || 0
		return bDownloads - aDownloads
	})
}

export function ConfigsClient({
	initialConfigs,
	initialSearchTerm,
	initialTotal,
	initialLimit,
}: Props) {
	const [configs, setConfigs] = useState<Config[]>(initialConfigs)
	const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '')
	const [total, setTotal] = useState(initialTotal)
	const [limit] = useState(initialLimit)
	const [offset, setOffset] = useState(initialConfigs.length)
	const [loadingFirst, setLoadingFirst] = useState(initialConfigs.length === 0)
	const [hasMore, setHasMore] = useState(initialConfigs.length < initialTotal)
	const [loadingMore, setLoadingMore] = useState(false)

	const sentinelRef = useRef<HTMLDivElement | null>(null)
	const isFetchingRef = useRef(false)
	const configsRef = useRef<Config[]>(initialConfigs)
	const lastFetchTsRef = useRef<number>(0)

	useEffect(() => {
		configsRef.current = configs
	}, [configs])

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value)
	}, [])

	const handleClearSearch = useCallback(() => {
		setSearchTerm('')
	}, [])

	const setTopConfigs = useCallback(
		(items: Config[], totalFromServer: number) => {
			setConfigs(items)
			setTotal(totalFromServer)
			setHasMore(items.length < totalFromServer && items.length > 0 && items.length >= limit)
		},
		[limit]
	)

	const mergeConfigs = useCallback(
		(items: Config[], totalFromServer?: number) => {
			setConfigs(prev => {
				const byId = new Map(prev.map(c => [c.id, c]))
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
					kind: 'presence',
					offset,
					limit,
				}),
			})

			if (!res.ok) {
				return
			}

			const data = (await res.json()) as {
				items: Config[]
				total: number
				offset: number
				limit: number
			}

			if (!data.items || data.items.length === 0) {
				setHasMore(false)
				return
			}

			mergeConfigs(data.items, data.total)
			setOffset(prev => prev + data.items.length)
			if (data.items.length < limit) {
				setHasMore(false)
			}
		} finally {
			setLoadingMore(false)
			isFetchingRef.current = false
			if (loadingFirst) setLoadingFirst(false)
		}
	}, [offset, limit, hasMore, loadingFirst, mergeConfigs])

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

		const refetchConfigById = async (configId: string) => {
			const now = Date.now()
			if (now - lastFetchTsRef.current < 250) {
				return
			}
			lastFetchTsRef.current = now

			try {
				const res = await fetch(`/api/v1/configs/${configId}?kind=presence`, {
					method: 'GET',
				})
				if (!res.ok) return
				const next = (await res.json()) as Config
				if (cancelled) return

				setConfigs(prev =>
					prev.map(c =>
						c.id === configId
							? {
									...c,
									downloads: next.downloads,
									title: next.title,
									description: next.description,
								}
							: c
					)
				)
			} catch {}
		}

		const refetchTopPresence = async () => {
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
						kind: 'presence',
						offset: 0,
						limit,
					}),
				})
				if (!res.ok) return
				const data = (await res.json()) as {
					items: Config[]
					total: number
					offset: number
					limit: number
				}
				if (cancelled) return
				if (!data.items || data.items.length === 0) return

				setTopConfigs(data.items, data.total)
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

			const belongsToList = !!configId && configsRef.current.some(c => c.id === configId)

			const isPresenceCreated =
				configsPing &&
				isFresh(configsPing.ts) &&
				configsKind === 'created' &&
				configsType === 'presence'

			const isPresenceDeleted =
				configsPing &&
				isFresh(configsPing.ts) &&
				configsKind === 'deleted' &&
				configsType === 'presence'

			const isPresenceDownload =
				downloadsPing &&
				isFresh(downloadsPing.ts) &&
				downloadsKind === 'presence_download' &&
				!!configId &&
				belongsToList

			if (!isPresenceCreated && !isPresenceDeleted && !isPresenceDownload) {
				return
			}

			if (isPresenceDownload && configId) {
				refetchConfigById(configId)
				return
			}

			if (isPresenceCreated) {
				refetchTopPresence()
				return
			}

			if (isPresenceDeleted && configId) {
				if (!belongsToList) {
					refetchTopPresence()
					return
				}
				setConfigs(prev => prev.filter(c => c.id !== configId))
				setTotal(prev => (prev > 0 ? prev - 1 : 0))
				return
			}
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [limit, mergeConfigs, setTopConfigs])

	const filteredConfigs = useMemo(() => filterConfigs(configs, searchTerm), [configs, searchTerm])
	const sortedConfigs = useMemo(() => sortConfigs(filteredConfigs), [filteredConfigs])

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
					<span>{sortedConfigs.length} presence found</span>
				</div>
			</div>

			<div className={styles.themes_right_side}>
				<PresenceGrid
					configs={sortedConfigs}
					loading={loadingFirst && !configs.length}
					hasMore={hasMore}
					loadingMore={loadingMore}
				/>
				<div ref={sentinelRef} className={styles.infinite_scroll_sentinel} />
			</div>
		</>
	)
}
