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
	profileHref: string
}

function CustomStatusPreview({ config, previewIndex, profileHref }: CustomStatusPreviewProps) {
	const configData: any = config.configData || {}
	const cycles = configData.statusCycles ?? []
	const maxLen = cycles.length || 1
	const localIndex = maxLen ? previewIndex % maxLen : 0
	const cycle = cycles[localIndex % maxLen] || { text: '' }

	return (
		<div className={`${styles.statuses_card_preview} ${styles.rpc_card_preview}`}>
			<div className={styles.rpc_card_preview_inner}>
				<StatusPreview
					discriminator={config.authorTag ? `#${config.authorTag}` : '#0001'}
					username={config.author || 'User'}
					currentStatus={cycle}
					currentIndex={localIndex}
					config={configData}
					avatarSrc={config.authorAvatar || '/logo.png'}
					profileHref={profileHref}
				/>
			</div>
		</div>
	)
}

type StatusesGridProps = {
	configs: Status[]
	loading?: boolean
	hasMore?: boolean
	loadingMore?: boolean
	allowDelete?: boolean
	ownStatusIds?: Set<string>
	forceOwnerMode?: boolean
	onDeleteStart?: (title?: string) => void
	onDeleteSuccess?: (title?: string) => void
	onDeleteError?: (message?: string) => void
}

export function StatusesGrid({
	configs,
	loading,
	hasMore,
	loadingMore,
	allowDelete,
	ownStatusIds,
	forceOwnerMode,
	onDeleteStart,
	onDeleteSuccess,
	onDeleteError,
}: StatusesGridProps) {
	const [previewTick, setPreviewTick] = useState(0)
	const [mounted, setMounted] = useState(false)
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
		const t = setTimeout(() => {}, 0)
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

	const showSkeletonFirst = loading && !localStatuses.length

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
		} catch {
			return
		}
	}

	const handleDelete = async (config: Status) => {
		if (!allowDelete) return

		const isOwn =
			forceOwnerMode ||
			(config as any).isOwn === true ||
			(!!ownStatusIds && ownStatusIds.has(String(config.id)))

		if (!isOwn) return

		setDeletingId(config.id)
		onDeleteStart?.(config.title)

		try {
			const res = await fetch(
				`/api/v1/configs/${encodeURIComponent(String(config.id))}/delete?kind=status`,
				{ method: 'DELETE' }
			)

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				const msg = data?.message || `Failed to delete status (${res.status})`
				throw new Error(msg)
			}

			setLocalStatuses(prev => prev.filter(s => s.id !== config.id))
			onDeleteSuccess?.(config.title)
		} catch (err: any) {
			onDeleteError?.(err?.message)
		} finally {
			setDeletingId(null)
		}
	}

	return (
		<section id='status-content' className={styles.page_section}>
			{showSkeletonFirst ? (
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
						const canDelete =
							allowDelete &&
							(forceOwnerMode ||
								(config as any).isOwn === true ||
								(!!ownStatusIds && ownStatusIds.has(String(config.id))))

						const tagString = String(config.authorTag ?? '').padStart(4, '0')
						const profileHref = `/profile/${encodeURIComponent(
							config.author || 'User'
						)}?tag=${encodeURIComponent(tagString)}`

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
											{canDelete && (
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

									<CustomStatusPreview
										config={config}
										previewIndex={baseIndex}
										profileHref={profileHref}
									/>

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

					{hasMore && loadingMore && (
						<>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_status}`}>
								<SkeletonCard height='status' />
							</div>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_status}`}>
								<SkeletonCard height='status' />
							</div>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_status}`}>
								<SkeletonCard height='status' />
							</div>
						</>
					)}
				</div>
			)}
		</section>
	)
}
