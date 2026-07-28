'use client'

import type { Plugin } from '@/services/firebase'
import { db } from '@/services/firebase'
import { onValue, ref } from 'firebase/database'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PluginsGrid } from '../../../components/activity-grid/plugins'
import styles from './plugins.module.scss'

type Props = {
	initialPlugins: Plugin[]
}

type ActivitySnapshot = {
	configs?: { ts: number; kind: string; configId: string; type: string }
	downloads?: { ts: number; kind: string; configId: string; downloads: number }
	profiles?: { ts: number; kind: string; configId?: string }
} | null

export function PluginsClient({ initialPlugins }: Props) {
	const [plugins, setPlugins] = useState<Plugin[]>(initialPlugins)
	const [searchTerm, setSearchTerm] = useState('')

	const handleClear = useCallback(() => setSearchTerm(''), [])

	useEffect(() => {
		let cancelled = false

		const activityRef = ref(db, 'activity')
		const unsubscribe = onValue(activityRef, snapshot => {
			if (cancelled) return

			const val = snapshot.val() as ActivitySnapshot
			if (!val) return

			const now = Date.now()
			const downloadsPing = val.downloads

			const isFresh = (ts?: number) => typeof ts === 'number' && now - ts <= 10000

			if (
				!downloadsPing ||
				!isFresh(downloadsPing.ts) ||
				downloadsPing.kind !== 'plugin_download'
			) {
				return
			}

			const pingId = downloadsPing.configId
			if (!pingId) return

			setPlugins(prev =>
				prev.map(plugin =>
					plugin.id === pingId
						? {
								...plugin,
								downloads:
									typeof downloadsPing.downloads === 'number'
										? downloadsPing.downloads
										: plugin.downloads + 1,
							}
						: plugin
				)
			)
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [])

	const filtered = useMemo(() => {
		const base = plugins
		if (!searchTerm) return base
		const t = searchTerm.toLowerCase()
		return base.filter(
			p =>
				p.title.toLowerCase().includes(t) ||
				p.description.toLowerCase().includes(t) ||
				p.author.toLowerCase().includes(t) ||
				(p.tags ?? []).some(tag => tag.toLowerCase().includes(t))
		)
	}, [plugins, searchTerm])

	return (
		<>
			<div className={styles.themes_left_side}>
				<form className={styles.search_container} onSubmit={e => e.preventDefault()}>
					<Search className={styles.search_icon} />
					<input
						className={styles.search}
						type='text'
						placeholder='Search plugins...'
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
					/>
					{searchTerm && (
						<button type='button' className={styles.search_clear_btn} onClick={handleClear}>
							<X size={16} />
						</button>
					)}
				</form>
				<div className={styles.stats_summary}>
					<span>
						{filtered.length} plugin{filtered.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>
			<div className={styles.themes_right_side}>
				<PluginsGrid plugins={filtered} />
			</div>
		</>
	)
}
