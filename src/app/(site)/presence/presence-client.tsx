'use client'

import { Config } from '@/app/(api)/api/v1/configs/route'
import { PresenceGrid } from '@/components/activity-grid/presence'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import styles from './presence.module.scss'

export type Props = {
	initialConfigs?: Config[]
	initialSearchTerm: string
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

export function ConfigsClient({ initialConfigs = [], initialSearchTerm }: Props) {
	const [configs, setConfigs] = useState<Config[]>(initialConfigs)
	const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function loadConfigs() {
			try {
				const res = await fetch('/api/v1/configs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ kind: 'presence' }),
				})

				if (!res.ok) {
					setConfigs([])
					return
				}

				const data = (await res.json()) as Config[]
				if (cancelled) return
				setConfigs(data)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		loadConfigs()

		return () => {
			cancelled = true
		}
	}, [])

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
			</div>

			<div className={styles.themes_right_side}>
				<PresenceGrid configs={sortedConfigs} loading={loading} />
			</div>
		</>
	)
}
