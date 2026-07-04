'use client'

import { Config } from '@/app/(api)/api/v1/configs/route'
import RpcPreview from '@components/rpc-preview/rpc-user'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import styles from './config-details.module.scss'
import { CopyJsonButton } from './copy-button'
import { DownloadJsonButton } from './download-button'
import { ConfigStructure } from './structure'

type Props = {
	configId: string
	initialPreviewTick: number
}

function getNextTick(prev: number) {
	return prev + 1
}

export function ConfigDetailsClient({ configId, initialPreviewTick }: Props) {
	const [config, setConfig] = useState<Config | null>(null)
	const [previewTick, setPreviewTick] = useState(initialPreviewTick)
	const [loading, setLoading] = useState(true)
	const [deleting, setDeleting] = useState(false)
	const [deleted, setDeleted] = useState(false)

	const { data: session } = useSession()

	useEffect(() => {
		let cancelled = false
		let eventSource: EventSource | null = null

		async function loadInitialConfig() {
			try {
				const res = await fetch(`/api/v1/configs/${configId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ kind: 'presence' }),
				})

				if (!res.ok) {
					if (!cancelled) setConfig(null)
					return false
				}

				const data = (await res.json()) as Config
				if (!cancelled) setConfig(data)
				return true
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		async function startStream() {
			const ok = await loadInitialConfig()
			if (!ok || cancelled) return

			eventSource = new EventSource(`/api/v1/configs/${configId}/stream?kind=presence`)

			eventSource.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Config
				setConfig(next)
			})

			eventSource.addEventListener('update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Config
				setConfig(next)
			})

			eventSource.addEventListener('not-found', () => {
				if (cancelled) return
				setConfig(null)
				setDeleted(true)
			})

			eventSource.onerror = () => {
				if (cancelled) return
			}
		}

		startStream()

		const interval = setInterval(() => {
			setPreviewTick(prev => getNextTick(prev))
		}, 3000)

		return () => {
			cancelled = true
			clearInterval(interval)
			eventSource?.close()
		}
	}, [configId])

	const isOwnerClient = useMemo(() => {
		if (!config) return false
		if (!session?.user?.id || !session.user.name) return false

		const tag = String(config.authorTag ?? '').padStart(4, '0')
		const sessionIdStartsWithTag = session.user.id.startsWith(tag)
		const sameName = session.user.name === config.author

		return sessionIdStartsWithTag && sameName
	}, [config, session?.user?.id, session?.user?.name])

	const isOwn = !!config && ((config as any).isOwn === true || isOwnerClient)

	const handleDelete = async () => {
		if (!config) return
		if (deleting) return
		if (!isOwn) return

		setDeleting(true)
		try {
			const res = await fetch(
				`/api/v1/configs/${encodeURIComponent(String(config.id))}/delete?kind=presence`,
				{
					method: 'DELETE',
				}
			)

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				throw new Error(data?.message || `Failed to delete config (${res.status})`)
			}

			setDeleted(true)
			setConfig(null)
		} catch (err) {
			console.error('Failed to delete config', err)
		} finally {
			setDeleting(false)
		}
	}

	if (loading) {
		return (
			<section id='addon-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<div className={styles.skel_back_link} />
								<div className={styles.skel_title} />
								<div className={styles.skel_subtitle} />
								<div className={styles.skel_meta_block}>
									<div className={styles.skel_meta_row} />
								</div>
								<div style={{ height: '39px', marginTop: '20px' }} className={styles.skel_rpc} />
								<div style={{ marginTop: '16px' }} className={styles.skel_meta_block}>
									<div className={styles.skel_meta_row} />
								</div>
							</div>
						</div>
						<div className={styles.addon_details_middle_column}>
							<div style={{ height: '358px' }} className={styles.skel_rpc} />
						</div>
						<div className={styles.addon_details_middle_column}>
							<div className={styles.skel_actions_panel}>
								<div className={styles.skel_actions_title} />
								<div className={styles.skel_actions_subtitle} />
								<div className={styles.skel_actions_btns}>
									<div className={styles.skel_btn} />
									<div className={styles.skel_btn} />
									<div className={styles.skel_btn} />
									<div className={styles.skel_btn} />
								</div>
							</div>
						</div>
					</div>
					<div className={styles.addon_details_left_column}>
						<div className={styles.skel_details_toggle} />
					</div>
				</div>
			</section>
		)
	}

	if (!config || deleted) {
		return (
			<section id='addon-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/presence' className={styles.back_link}>
									← Back to Presence
								</a>
								<h1 className={styles.title}>{deleted ? 'Config deleted' : 'Config not found'}</h1>
								<div className={styles.title_description}>
									{deleted
										? 'This config was deleted.'
										: 'This config may have been removed or is not available.'}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		)
	}

	const configData: any = config.configData

	const cycles = configData.cycles?.length ? configData.cycles : [{ details: '', state: '' }]
	const images = configData.imageCycles?.length ? configData.imageCycles : [{ largeImage: '' }]
	const buttonsList = configData.buttonPairs?.length
		? configData.buttonPairs
		: [{ label1: '', url1: '' }]

	const maxLen = Math.max(cycles.length || 1, images.length || 1, buttonsList.length || 1)
	const localIndex = maxLen ? previewTick % maxLen : 0

	const cycleIndex = localIndex % cycles.length
	const imageIndex = localIndex % images.length
	const buttonIndex = localIndex % buttonsList.length

	const firstCycle = cycles[cycleIndex]
	const firstImage = images[imageIndex]
	const firstButtons = buttonsList[buttonIndex]
	const avatarSrc = config.authorAvatar || '/logo.png'

	const handleOpenInApp = async () => {
		window.location.href = `voidpresence://import-config?title=${encodeURIComponent(
			config.title
		)}&data=${encodeURIComponent(JSON.stringify(config.configData))}`

		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'presence_download', id: config.id }),
			})
		} catch (err) {
			console.error('Failed to track open in app', err)
		}
	}

	return (
		<section id='addon-details' className={styles.page_section}>
			<div className={styles.theme_view_panel}>
				<img
					key={firstImage.largeImage || null}
					src={firstImage.largeImage || undefined}
					className={styles.addon_backdrop}
					alt=''
				/>
				<div>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/presence' className={styles.back_link}>
									← Back to Presence
								</a>
								<h1 className={styles.title}>{config.title}</h1>
								<div className={styles.title_description}>{config.description}</div>
								<section className={styles.addon_actions}>
									<div className={styles.btn_container}>
										<a
											href={`/profile/${encodeURIComponent(config.author)}?tag=${encodeURIComponent(
												String(config.authorTag ?? '').padStart(4, '0')
											)}`}
											className={styles.download_btn_primary}
										>
											Open profile
										</a>
									</div>
								</section>
								<section className={styles.about_addon}>
									<span className={styles.addon_metadata_row}>
										<strong>Downloads: </strong>
										{config.downloads.toLocaleString()}
									</span>
								</section>
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.rpc_card_preview}>
								<RpcPreview
									discriminator={`#${String(config.authorTag ?? '') || '0001'}`}
									username={config.author || 'User'}
									avatarSrc={avatarSrc}
									currentCycle={firstCycle}
									currentImage={firstImage}
									currentButtons={firstButtons}
									currentIndex={localIndex}
									config={configData}
								/>
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.actions_panel}>
								<h2 className={styles.actions_title}>Config actions</h2>
								<p className={styles.actions_subtitle}>
									Export or share this Discord Rich Presence config.
								</p>
								<div className={styles.actions_buttons}>
									<a className={styles.action_btn_primary} onClick={handleOpenInApp}>
										Open in app
										<span className={styles.action_btn_hint}>import .json</span>
									</a>
									<DownloadJsonButton configId={config.id} />
									<CopyJsonButton configId={config.id} />
									{isOwn && (
										<button
											className={styles.action_btn_primary}
											disabled={deleting}
											onClick={handleDelete}
										>
											{deleting ? 'Deleting…' : 'Delete config'}
											<span className={styles.action_btn_hint}>delete .json</span>
										</button>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className={styles.addon_details_left_column}>
						<ConfigStructure configData={configData} />
					</div>
				</div>
			</div>
		</section>
	)
}
