'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Config, Status } from '@/service/firebase'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import styles from './profile-configs.module.scss'

type Props = {
	initialConfigs?: Config[]
	initialStatuses?: Status[]
	configs?: Config[]
	statuses?: Status[]
	loading?: boolean
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

export function ProfileConfigsClient({
	initialConfigs = [],
	initialStatuses = [],
	configs,
	statuses,
	loading = false,
}: Props) {
	const [searchTerm, setSearchTerm] = useState('')
	const liveConfigs = configs ?? initialConfigs
	const liveStatuses = statuses ?? initialStatuses

	const filteredConfigs = useMemo(
		() => filterConfigs(liveConfigs, searchTerm),
		[liveConfigs, searchTerm]
	)

	const filteredStatuses = useMemo(
		() => filterStatuses(liveStatuses, searchTerm),
		[liveStatuses, searchTerm]
	)

	return (
		<section className={styles.profile_section}>
			<div className={styles.profile_configs_layout}>
				<div className={styles.profile_header_row}>
					<div className={styles.profile_header_title}>Your configs</div>
				</div>

				<form className={styles.profile_search_container} onSubmit={e => e.preventDefault()}>
					<Search className={styles.profile_search_icon} />
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

				<div className={styles.profile_stats_row}>
					<span>{filteredConfigs.length} presence found</span>
				</div>
				<div className={styles.profile_stats_row}>
					<span>{filteredStatuses.length} statuses found</span>
				</div>

				<div className={styles.themes_right_side}>
					<PresenceGrid
						configs={filteredConfigs}
						loading={loading}
						allowDelete={true}
						forceOwnerMode={true}
					/>
					<div style={{ marginTop: '20px' }} />
					<StatusesGrid
						configs={filteredStatuses}
						loading={loading}
						allowDelete={true}
						forceOwnerMode={true}
					/>
				</div>
			</div>
		</section>
	)
}
