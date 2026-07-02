'use client'

import { InfoBox } from '@/components/status-info/info-box'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import styles from '../../(site)/presence/presence.module.scss'
import { ApiEndpoint, ApiSectionBase } from './api-client'

type Props = {
	initialEndpoints: ApiEndpoint[]
}

function filterEndpoints(list: ApiEndpoint[], term: string) {
	const q = term.toLowerCase()
	if (!q) return list
	return list.filter(endpoint => {
		const path = endpoint.path.toLowerCase()
		const title = endpoint.title.toLowerCase()
		const desc = endpoint.description.toLowerCase()
		const method = endpoint.method.toLowerCase()
		return path.includes(q) || title.includes(q) || desc.includes(q) || method.includes(q)
	})
}

export function ApiDocsClient({ initialEndpoints }: Props) {
	const [searchTerm, setSearchTerm] = useState('')

	const filteredEndpoints = useMemo(
		() => filterEndpoints(initialEndpoints, searchTerm),
		[initialEndpoints, searchTerm]
	)

	const totalCount = initialEndpoints.length

	const left = (
		<>
			<InfoBox
				title='API overview'
				lines={[
					'Use these HTTP endpoints to fetch presence configs and status cycles directly from Void Presence.',
					'All responses are JSON and designed to be copy-pastable into your own tools or scripts.',
				]}
			/>
			<InfoBox
				variant='secondary'
				title='API resources'
				lines={[
					'Endpoints cover presence configs, status cycles and authentication helpers.',
					'Use them from your own tools or backend services to integrate with Void Presence.',
				]}
			/>
			<InfoBox
				variant='secondary'
				title='Authentication'
				lines={[
					'Most public endpoints do not require authentication.',
					'You can inspect all HTTP API references directly in the web source.',
				]}
				linkHref='https://github.com/Devollox/void-web/tree/main/src/app/(api)/api'
				linkLabel='View API references on GitHub'
			/>
			<InfoBox
				variant='muted'
				title='Rate limits & usage'
				lines={[
					'Avoid polling these endpoints aggressively from public clients.',
					'Prefer calling them from your own backend or tools when possible.',
				]}
			/>
		</>
	)

	const right = (
		<>
			<div className={styles.themes_left_side}>
				<form className={styles.search_container} onSubmit={e => e.preventDefault()}>
					<Search className={styles.search_icon} />
					<input
						className={styles.search}
						type='text'
						placeholder='Search by path, title or description...'
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
					<span>
						{filteredEndpoints.length} endpoints found
						{searchTerm && ` (of ${totalCount})`}
					</span>
				</div>
			</div>
		</>
	)

	return (
		<>
			<div className={styles.themes_right_side}>
				<ApiSectionBase
					left={left}
					right={right}
					title='API endpoints'
					basePath='/api'
					endpoints={filteredEndpoints}
				/>
			</div>
		</>
	)
}
