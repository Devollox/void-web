'use client'

import type { Status } from '@/service/firebase'
import { Download, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import StatusPreview from '../statuses-preview/status-user'
import styles from './activity-grid.module.scss'
import { SkeletonCard } from './skeleton-card'

type CustomStatusPreviewProps = {
	config: Status
	previewIndex: number
}

function CustomStatusPreview({ config, previewIndex }: CustomStatusPreviewProps) {
	const configData: any = config.configData || {}
	const cycles = configData.statusCycles ?? []
	const maxLen = cycles.length || 1
	const localIndex = maxLen ? previewIndex % maxLen : 0
	const cycle = cycles[localIndex % maxLen] || { text: '' }

	return (
		<div className={styles.rpc_card_preview}>
			<div className={styles.rpc_card_preview_inner}>
				<StatusPreview
					discriminator={config.authorTag ? `#${config.authorTag}` : '#0001'}
					username={config.author || 'User'}
					currentStatus={cycle}
					currentIndex={localIndex}
					config={configData}
					avatarSrc={config.authorAvatar || '/logo.png'}
				/>
			</div>
		</div>
	)
}

type StatusesGridProps = {
	configs: Status[]
	loading?: boolean
	allowDelete?: boolean
}

export function StatusesGrid({ configs, loading, allowDelete }: StatusesGridProps) {
	const [previewTick, setPreviewTick] = useState(0)
	const [mounted, setMounted] = useState(false)
	const [animateColors, setAnimateColors] = useState(false)
	const [localStatuses, setLocalStatuses] = useState<Status[]>(configs)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [showEmpty, setShowEmpty] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		setLocalStatuses(configs)
	}, [configs])

	useEffect(() => {
		const t = setTimeout(() => setAnimateColors(true), 100)
		const i = setInterval(() => setPreviewTick(prev => prev + 1), 3000)
		return () => {
			clearTimeout(t)
			clearInterval(i)
		}
	}, [])

	useEffect(() => {
		if (loading) {
			setShowEmpty(false)
			return
		}
		if (localStatuses.length > 0) {
			setShowEmpty(false)
			return
		}
		const timer = setTimeout(() => setShowEmpty(true), 500)
		return () => clearTimeout(timer)
	}, [loading, localStatuses.length])

	const showSkeleton = loading && !localStatuses.length

	const handleOpenInApp = async (config: Status) => {
		window.location.href = `voidpresence://import-status-config?title=${encodeURIComponent(
			config.title
		)}&data=${encodeURIComponent(JSON.stringify(config.configData ?? {}))}`

		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'status_download', id: config.id }),
			})
		} catch (err) {
			console.error('Failed to track open in app', err)
		}
	}

	const handleDelete = async (config: Status) => {
		if (!allowDelete) return
		setDeletingId(config.id)
		try {
			const res = await fetch(
				`/api/v1/configs/${encodeURIComponent(String(config.id))}/delete?kind=status`,
				{
					method: 'DELETE',
				}
			)

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				throw new Error(data?.message || `Failed to delete config (${res.status})`)
			}
		} catch (err) {
			console.error('Failed to delete status', err)
		} finally {
			setDeletingId(null)
		}
	}

	return (
		<section id='status-content' className={styles.page_section}>
			{showSkeleton ? (
				<div className={styles.theme_listings}>
					<SkeletonCard height='status' />
					<SkeletonCard height='status' />
					<SkeletonCard height='status' />
				</div>
			) : showEmpty ? (
				<div className={styles.empty_state}>
					<p>No status found.</p>
				</div>
			) : (
				<div className={styles.cards_grid}>
					{localStatuses.map((config, index) => {
						const baseIndex = mounted ? previewTick + index : 0

						return (
							<div key={config.id} className={styles.card_wrap}>
								<div className={styles.card}>
									<div className={styles.card_header}>
										<div className={styles.card_title}>
											<h3 className={styles.card_title}>{config.title}</h3>
										</div>
										<div className={styles.download_tag_group}>
											<div className={styles.download_tag}>
												<Download size={14} className={styles.download_icon} />
												<span className={styles.download_text}>
													{config.downloads.toLocaleString()}
												</span>
											</div>
											{allowDelete && (
												<button
													type='button'
													className={styles.profile_delete_tag}
													disabled={deletingId === config.id}
													onClick={() => handleDelete(config)}
												>
													<Trash size={14} />
												</button>
											)}
										</div>
									</div>

									<CustomStatusPreview config={config} previewIndex={baseIndex} />

									<div className={styles.card_actions}>
										<div className={styles.card_buttons}>
											<a className={styles.btn_primary} onClick={() => handleOpenInApp(config)}>
												Open in app
											</a>
											<a className={styles.btn_secondary} href={`/statuses/${config.id}`}>
												Show details
											</a>
										</div>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}
		</section>
	)
}
