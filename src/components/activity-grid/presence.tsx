'use client'

import type { Config } from '@service/firebase'
import { Download, Trash } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import RpcPreview from '../rpc-preview/rpc-user'
import styles from './activity-grid.module.scss'
import { SkeletonCard } from './skeleton-card'

type CustomRpcPreviewProps = {
	config: Config
	previewIndex: number
	avatarSrc: string
	profileHref: string
}

const CustomRpcPreview = memo(function CustomRpcPreview({
	config,
	previewIndex,
	avatarSrc,
	profileHref,
}: CustomRpcPreviewProps) {
	const configData: any = config.configData || {}
	const authorTag: any = config.authorTag
	const cycles = configData.cycles ?? []
	const images = configData.imageCycles ?? []
	const buttonPairs = configData.buttonPairs ?? []
	const maxLen = Math.max(cycles.length || 1, images.length || 1, buttonPairs.length || 1)
	const localIndex = maxLen ? previewIndex % maxLen : 0
	const cycle = cycles[localIndex % (cycles.length || 1)] || { details: '', state: '' }
	const imageIndex = images.length ? localIndex % images.length : 0
	const image = images[imageIndex] || { largeImage: '' }
	const buttons = buttonPairs[localIndex % (buttonPairs.length || 1)] ?? {
		label1: '',
		url1: '',
	}

	return (
		<div className={`${styles.rpc_card_presence} ${styles.rpc_card_preview}`}>
			<div className={styles.rpc_card_preview_inner}>
				<RpcPreview
					discriminator={authorTag ? `#${authorTag}` : '#0001'}
					username={config.author || 'User'}
					avatarSrc={avatarSrc}
					currentCycle={cycle}
					currentImage={image}
					currentButtons={buttons}
					currentIndex={localIndex}
					config={configData}
					profileHref={profileHref}
				/>
			</div>
		</div>
	)
})

type PresenceGridProps = {
	configs: Config[]
	loading?: boolean
	hasMore?: boolean
	loadingMore?: boolean
	allowDelete?: boolean
	ownConfigIds?: Set<string>
	forceOwnerMode?: boolean
	onDeleteStart?: (title?: string) => void
	onDeleteSuccess?: (title?: string) => void
	onDeleteError?: (message?: string) => void
}

export function PresenceGrid({
	configs,
	loading,
	hasMore,
	loadingMore,
	allowDelete,
	ownConfigIds,
	forceOwnerMode,
	onDeleteStart,
	onDeleteSuccess,
	onDeleteError,
}: PresenceGridProps) {
	const [previewTick, setPreviewTick] = useState(0)
	const [mounted, setMounted] = useState(false)
	const [animateColors, setAnimateColors] = useState(false)
	const [localConfigs, setLocalConfigs] = useState<Config[]>(configs)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [showEmpty, setShowEmpty] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		setLocalConfigs(configs)
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
		if (localConfigs.length > 0) {
			setShowEmpty(false)
			return
		}
		const timer = setTimeout(() => setShowEmpty(true), 500)
		return () => clearTimeout(timer)
	}, [loading, localConfigs.length])

	const showSkeletonFirst = loading && !localConfigs.length

	const handleOpenInApp = async (config: Config) => {
		window.location.href = `voidpresence://import-config?title=${encodeURIComponent(
			config.title
		)}&data=${encodeURIComponent(JSON.stringify(config.configData))}`

		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'presence_download', id: config.id }),
			})
		} catch {
			return
		}
	}

	const handleDelete = async (config: Config) => {
		if (!allowDelete) return

		const isOwn =
			forceOwnerMode ||
			(config as any).isOwn === true ||
			(!!ownConfigIds && ownConfigIds.has(String(config.id)))

		if (!isOwn) return

		setDeletingId(config.id)
		onDeleteStart?.(config.title)

		try {
			const res = await fetch(
				`/api/v1/configs/${encodeURIComponent(String(config.id))}/delete?kind=presence`,
				{ method: 'DELETE' }
			)

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				const msg = data?.message || `Failed to delete config (${res.status})`
				throw new Error(msg)
			}

			setLocalConfigs(prev => prev.filter(c => c.id !== config.id))
			onDeleteSuccess?.(config.title)
		} catch (err: any) {
			onDeleteError?.(err?.message)
		} finally {
			setDeletingId(null)
		}
	}

	const uniqueConfigsMap = new Map<string, Config>()
	for (const c of localConfigs) {
		uniqueConfigsMap.set(String(c.id), c)
	}
	const uniqueConfigs = Array.from(uniqueConfigsMap.values())

	return (
		<section id='configs-content' className={styles.page_section}>
			{showSkeletonFirst ? (
				<div className={styles.theme_listings}>
					<SkeletonCard height='presence' />
					<SkeletonCard height='presence' />
					<SkeletonCard height='presence' />
				</div>
			) : showEmpty ? (
				<div className={styles.empty_state}>
					<p>No presence found.</p>
				</div>
			) : (
				<div className={styles.cards_grid}>
					{uniqueConfigs.map((config, index) => {
						const configData: any = config.configData || {}
						const perImageColors =
							Array.isArray((config as any).averageColors) &&
							(config as any).averageColors.length > 0
								? ((config as any).averageColors as string[])
								: []

						const cyclesLen = configData.cycles?.length || 1
						const imagesLen = configData.imageCycles?.length || 1
						const buttonsLen = configData.buttonPairs?.length || 1
						const maxLen = Math.max(cyclesLen || 1, imagesLen || 1, buttonsLen || 1)

						const baseIndex = mounted ? previewTick + index : 0
						const localIndex = maxLen ? baseIndex % maxLen : 0

						const imageIndex = imagesLen ? localIndex % imagesLen : 0

						const perImageHighlight =
							perImageColors.length > 0
								? perImageColors[imageIndex % perImageColors.length]
								: undefined

						const highlight = animateColors
							? perImageHighlight || (config as any).averageColor || '#5b5b5b'
							: '#5b5b5b'

						const hasColor =
							animateColors && (Boolean(perImageHighlight) || Boolean((config as any).averageColor))

						const borderColor = `${highlight}66`
						const avatarSrc = config.authorAvatar || '/logo.png'
						const canDelete = !!(
							allowDelete &&
							(forceOwnerMode ||
								(config as any).isOwn === true ||
								(!!ownConfigIds && ownConfigIds.has(String(config.id))))
						)

						const tagString = String(config.authorTag ?? '').padStart(4, '0')
						const profileHref = `/profile/${encodeURIComponent(
							config.author || 'User'
						)}?tag=${encodeURIComponent(tagString)}`

						const rawDownloads = (config as any).downloads
						const downloads =
							typeof rawDownloads === 'number'
								? rawDownloads
								: parseInt(String(rawDownloads ?? '0')) || 0

						return (
							<div
								key={config.id}
								className={`${styles.card_wrap} ${
									hasColor ? styles.card_wrap_hasColor : ''
								} ${styles.card_wrap_loaded}`}
								style={{
									background: 'rgba(26, 26, 26, 0.96)',
									borderColor,
									['--card-highlight' as any]: highlight,
								}}
							>
								<div className={styles.card}>
									<div className={styles.card_header}>
										<div className={styles.card_title}>
											<h3 className={styles.card_title}>{config.title}</h3>
										</div>
										<div className={styles.download_tag_group}>
											<div className={styles.download_tag}>
												<Download size={14} className={styles.download_icon} />
												<span className={styles.download_text}>{downloads.toLocaleString()}</span>
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

									<CustomRpcPreview
										config={config}
										previewIndex={baseIndex}
										avatarSrc={avatarSrc}
										profileHref={profileHref}
									/>

									<div className={styles.card_actions}>
										<div className={styles.card_buttons}>
											<a className={styles.btn_primary} onClick={() => handleOpenInApp(config)}>
												Open in app
											</a>
											<a className={styles.btn_secondary} href={`/presence/${config.id}`}>
												Show details
											</a>
										</div>
									</div>
								</div>
								<div style={{ display: 'none' }}>
									{configData.imageCycles?.map((img: any, i: number) => (
										<img key={i} src={img.largeImage} alt='' />
									))}
								</div>
							</div>
						)
					})}

					{hasMore && loadingMore && (
						<>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_presence}`}>
								<SkeletonCard height='presence' />
							</div>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_presence}`}>
								<SkeletonCard height='presence' />
							</div>
							<div className={`${styles.skeleton_card_wrap} ${styles.skeleton_card_wrap_presence}`}>
								<SkeletonCard height='presence' />
							</div>
						</>
					)}
				</div>
			)}
		</section>
	)
}
