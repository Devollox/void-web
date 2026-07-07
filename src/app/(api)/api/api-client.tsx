import ChangelogClient from '@/app/(site)/download/changelog-client'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { useState } from 'react'
import styles from '../../(site)/schedule/release-schedule.module.scss'
import apiStyles from './api.module.scss'

export type ApiGroupType =
	| 'presence'
	| 'statuses'
	| 'auth'
	| 'internal'
	| 'authors'
	| 'configs'
	| 'github'
	| 'users'
	| 'analytics'

export interface ApiEndpoint {
	id: string
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	title: string
	description: string
	group: ApiGroupType
	authRequired?: boolean
	hasExample?: boolean
	hasChangelog?: boolean
	samplePayload?: unknown
	fetchPayload?: string
}

interface ApiSectionBaseProps {
	left: React.ReactNode
	right: React.ReactNode
	endpoints: ApiEndpoint[]
	basePath: string
	title: string
}

function getVersionLabel(endpoints: ApiEndpoint[]): string {
	if (endpoints.length === 0) return 'v0'
	const path = endpoints[0].path
	const match = path.match(/^\/v(\d+)\//)
	if (match && match[1]) {
		return `v${match[1]}`
	}
	return 'v0'
}

function getDotClass(method: ApiEndpoint['method']): string {
	return method === 'POST'
		? apiStyles.dot_nightly
		: method === 'GET'
			? apiStyles.dot_stable
			: method === 'DELETE'
				? apiStyles.dot_broken
				: method === 'PUT'
					? apiStyles.dot_prerelease
					: apiStyles.dot_eol
}

function ApiCardItem({ endpoint }: { endpoint: ApiEndpoint }) {
	const [open, setOpen] = useState(false)
	const [copied, setCopied] = useState(false)
	const dotClass = getDotClass(endpoint.method)

	const API_ORIGIN_V0 = 'https://voidpresence.site'
	const API_ORIGIN_VX = 'https://api.voidpresence.site'

	function getApiOrigin(path: string) {
		const match = path.match(/^\/v(\d+)\//)
		if (match && match[1] && match[1] !== '0') {
			return API_ORIGIN_VX
		}
		return API_ORIGIN_V0
	}

	const origin = getApiOrigin(endpoint.path)
	const fullUrl = `${origin}${endpoint.path}`

	const handleCardToggle = () => {
		setOpen(prev => !prev)
	}

	const handleCopyUrl = async (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		try {
			await navigator.clipboard.writeText(fullUrl)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {}
	}

	const resultNotes =
		endpoint.samplePayload != null
			? '```json\n' + JSON.stringify(endpoint.samplePayload, null, 2) + '\n```'
			: ''

	const fetchNotes =
		endpoint.fetchPayload != null ? '```ts\n' + endpoint.fetchPayload + '\n```' : ''

	return (
		<li className={apiStyles.api_item}>
			<div className={apiStyles.api_card} onClick={handleCardToggle} style={{ cursor: 'pointer' }}>
				<div className={apiStyles.api_card_top}>
					<div className={apiStyles.api_card_left}>
						<div className={apiStyles.api_row}>
							<span className={apiStyles.api_path}>{endpoint.path}</span>
							<span className={apiStyles.api_method_badge}>{endpoint.method}</span>
						</div>
					</div>

					<div className={apiStyles.api_row}>
						<span className={apiStyles.api_card_date}>
							{endpoint.authRequired ? 'Auth required' : 'Public'}
						</span>
					</div>
				</div>

				<div className={apiStyles.api_card_meta}>
					<div className={apiStyles.electron_row}>
						<div className={apiStyles.dot_wrap}>
							<span className={`${apiStyles.dot} ${dotClass}`} />
						</div>
						<span className={apiStyles.electron_versions}>{endpoint.title}</span>
					</div>
					<span className={apiStyles.api_card_meta_item}>{endpoint.description}</span>
				</div>

				<div
					className={
						open
							? `${apiStyles.api_card_details} ${apiStyles.api_card_details_open}`
							: apiStyles.api_card_details
					}
				>
					<div className={apiStyles.api_card_meta}>
						<div className={apiStyles.api_row} style={{ justifyContent: 'space-between' }}>
							<div style={{ minWidth: 0 }}>
								<div
									onClick={handleCopyUrl}
									className={apiStyles.api_card_meta_item}
									style={{ fontFamily: 'monospace' }}
								>
									{fullUrl} {copied ? 'Copied!' : 'Copy URL'}
								</div>
							</div>
						</div>

						<div className={apiStyles.api_row}>
							<span className={apiStyles.api_card_meta_item}>JSON response</span>
							{endpoint.hasExample && (
								<span className={apiStyles.api_card_meta_item}>Has example</span>
							)}
						</div>
					</div>

					{(fetchNotes || resultNotes) && (
						<div className={apiStyles.release_card_changelog} onClick={e => e.stopPropagation()}>
							{fetchNotes && (
								<>
									{' '}
									<ChangelogClient
										release={{
											version: '',
											date: '',
											notes: fetchNotes,
											assets: [],
											versionType: 'apiBody',
										}}
									/>
									<div style={{ marginTop: 8, fontSize: 12, color: '#888' }} />
								</>
							)}
							{resultNotes && (
								<ChangelogClient
									release={{
										version: '',
										date: '',
										notes: resultNotes,
										assets: [],
										versionType: 'api',
									}}
								/>
							)}
						</div>
					)}
				</div>
			</div>
		</li>
	)
}

function renderGroupedEndpoints(list: ApiEndpoint[]) {
	const groups: Record<ApiGroupType, ApiEndpoint[]> = {
		presence: [],
		statuses: [],
		auth: [],
		internal: [],
		authors: [],
		configs: [],
		github: [],
		users: [],
		analytics: [],
	}

	for (const ep of list) {
		groups[ep.group].push(ep)
	}

	const entries = Object.entries(groups).filter(([, items]) => items.length > 0)

	return entries.map(([groupKey, items], idx) => {
		const group = groupKey as ApiGroupType
		const isLast = idx === entries.length - 1

		return (
			<div key={group} style={{ marginBottom: isLast ? 0 : 16 }}>
				<ul className={apiStyles.api_list}>
					{items.map(endpoint => (
						<ApiCardItem key={endpoint.id} endpoint={endpoint} />
					))}
				</ul>
			</div>
		)
	})
}

export function ApiSectionBase({ left, right, endpoints, basePath, title }: ApiSectionBaseProps) {
	const versionedEndpoints = endpoints.filter(ep => ep.path.match(/\/v(\d+)\//))
	const legacyEndpoints = endpoints.filter(ep => !ep.path.match(/\/v(\d+)\//))

	const versionLabel = getVersionLabel(versionedEndpoints)

	return (
		<PanelLayout
			left={left}
			right={
				<section className={styles.page_section}>
					{right}
					<div className={layoutStyles.preview_card_wrap}>
						<div className={layoutStyles.preview_card}>
							{versionedEndpoints.length > 0 && (
								<>
									<div className={layoutStyles.preview_header}>
										<h3 className={styles.preview_title}>{title}</h3>
										<div className={layoutStyles.preview_badge}>
											<span className={layoutStyles.preview_badge_text}>{versionLabel}</span>
										</div>
									</div>

									{renderGroupedEndpoints(versionedEndpoints)}
								</>
							)}

							{legacyEndpoints.length > 0 && (
								<>
									<div className={layoutStyles.preview_header}>
										<h3 className={styles.preview_title}></h3>
										<div className={layoutStyles.preview_badge}>
											<span className={layoutStyles.preview_badge_text}>v0</span>
										</div>
									</div>

									{renderGroupedEndpoints(legacyEndpoints)}
								</>
							)}

							<p className={styles.release_footer_note}>
								All endpoints respond with JSON and follow the same structure as your presence and
								status configs.
							</p>
						</div>
					</div>
				</section>
			}
		/>
	)
}
