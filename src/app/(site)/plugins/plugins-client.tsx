'use client'

import type { Plugin } from '@service/firebase'
import { Search, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { PluginsGrid } from './plugins-grid'
import styles from './plugins.module.scss'

type Props = {
	initialPlugins: Plugin[]
	initialTotal: number
}

export function PluginsClient({ initialPlugins, initialTotal }: Props) {
	const [searchTerm, setSearchTerm] = useState('')
	const handleClear = useCallback(() => setSearchTerm(''), [])

	const filtered = useMemo(() => {
		if (!searchTerm) return initialPlugins
		const t = searchTerm.toLowerCase()
		return initialPlugins.filter(
			p =>
				p.title.toLowerCase().includes(t) ||
				p.description.toLowerCase().includes(t) ||
				p.author.toLowerCase().includes(t) ||
				(p.tags ?? []).some(tag => tag.toLowerCase().includes(t))
		)
	}, [initialPlugins, searchTerm])

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
						{filtered.length} plugin{filtered.length !== 1 ? 's' : ''} found
					</span>
				</div>
			</div>
			<div className={styles.themes_right_side}>
				<PluginsGrid plugins={filtered} />
			</div>
		</>
	)
}
