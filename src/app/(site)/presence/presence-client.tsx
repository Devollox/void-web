'use client'

import { Config } from '@/app/(api)/api/v1/configs/route'
import { PresenceGrid } from '@/components/activity-grid/presence'
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

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value)
	}, [])

	const handleClearSearch = useCallback(() => {
		setSearchTerm('')
	}, [])

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

			setConfigs(prev => {
				const byId = new Map(prev.map(c => [c.id, c]))
				for (const item of data.items) {
					byId.set(item.id, item)
				}
				const merged = Array.from(byId.values())
				setHasMore(merged.length < data.total)
				return merged
			})

			setTotal(data.total)
			setOffset(prev => prev + data.items.length)
		} finally {
			setLoadingMore(false)
			isFetchingRef.current = false
			if (loadingFirst) setLoadingFirst(false)
		}
	}, [offset, limit, hasMore, loadingFirst])

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
				rootMargin: '300px',
				threshold: 0,
			}
		)

		observer.observe(elem)

		return () => {
			observer.disconnect()
		}
	}, [loadMore])

	useEffect(() => {
		const es = new EventSource('/api/v1/configs/stream?kind=presence')

		es.addEventListener('ready', e => {
			const data = JSON.parse((e as MessageEvent).data) as Config[]
			setConfigs(data)
			setTotal(data.length)
			setOffset(data.length)
			setHasMore(false)
			if (loadingFirst) setLoadingFirst(false)
		})

		es.addEventListener('created', e => {
			const cfg = JSON.parse((e as MessageEvent).data) as Config
			setConfigs(prev => {
				const byId = new Map(prev.map(c => [c.id, c]))
				byId.set(cfg.id, cfg)
				return Array.from(byId.values())
			})
			setTotal(prev => prev + 1)
		})

		es.addEventListener('deleted', e => {
			const { id } = JSON.parse((e as MessageEvent).data) as { id: string }
			setConfigs(prev => prev.filter(c => c.id !== id))
			setTotal(prev => (prev > 0 ? prev - 1 : 0))
		})

		es.addEventListener('downloads', e => {
			const { id, downloads } = JSON.parse((e as MessageEvent).data) as {
				id: string
				downloads: number
			}
			setConfigs(prev => prev.map(c => (c.id === id ? { ...c, downloads } : c)))
		})

		return () => {
			es.close()
		}
	}, [loadingFirst])

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
