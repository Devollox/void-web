'use client'

import StatusPreview from '@components/statuses-preview/status-user'
import type { Status } from '@service/firebase'
import { onStatusByIdChange } from '@service/firebase'
import { useEffect, useState } from 'react'
import styles from '../../presence/[id]/config-details.module.scss'
import { CopyJsonButton } from './copy-button'
import { DownloadJsonButton } from './download-button'
import { StatusStructure } from './structure'

type Props = {
	statusId: string
	initialPreviewTick: number
}

function getNextTick(prev: number) {
	return prev + 1
}

export function StatusDetailsClient({ statusId, initialPreviewTick }: Props) {
	const [status, setStatus] = useState<Status | null>(null)
	const [previewTick, setPreviewTick] = useState(initialPreviewTick)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const unsubscribe = onStatusByIdChange(statusId, next => {
			setStatus(next)
			setLoading(false)
		})

		const interval = setInterval(() => {
			setPreviewTick(prev => getNextTick(prev))
		}, 3000)

		return () => {
			unsubscribe()
			clearInterval(interval)
		}
	}, [statusId])

	if (loading) {
		return (
			<section id='status-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<div className={styles.skel_back_link} />
								<div className={styles.skel_title} />
								<div className={styles.skel_subtitle} />
								<div className={styles.skel_meta_block}>
									<div className={styles.skel_meta_row} />
									<div className={styles.skel_meta_row} />
									<div className={styles.skel_meta_row} />
								</div>
							</div>
						</div>
						<div className={styles.addon_details_middle_column}>
							<div className={styles.skel_rpc} />
						</div>
						<div className={styles.addon_details_middle_column}>
							<div className={styles.skel_actions_panel}>
								<div className={styles.skel_actions_title} />
								<div className={styles.skel_actions_subtitle} />
								<div className={styles.skel_actions_btns}>
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

	if (!status) {
		return (
			<section id='status-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/statuses' className={styles.back_link}>
									← Back to Statuses
								</a>
								<h1 className={styles.title}>Status not found</h1>
								<div className={styles.title_description}>
									This status may have been removed or is not available.
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		)
	}

	const cycles = status.configData?.statusCycles ?? []
	const maxLen = cycles.length || 1
	const localIndex = maxLen ? previewTick % maxLen : 0
	const cycleIndex = localIndex % maxLen
	const currentCycle = cycles[cycleIndex] || { text: '' }
	const avatarSrc = status.authorAvatar || '/logo.png'

	const handleOpenInApp = async () => {
		window.location.href = `voidpresence://import-status-config?title=${encodeURIComponent(
			status.title
		)}&data=${encodeURIComponent(JSON.stringify(status.configData ?? {}))}`

		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'status_download', id: status.id }),
			})
		} catch (err) {
			console.error('Failed to track open in app', err)
		}
	}

	return (
		<section id='status-details' className={styles.page_section}>
			<div className={styles.theme_view_panel}>
				<div>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/statuses' className={styles.back_link}>
									← Back to Statuses
								</a>
								<h1 className={styles.title}>{status.title}</h1>
								<div className={styles.title_description}>{status.description}</div>
								<section className={styles.addon_actions}>
									<div className={styles.btn_container}>
										<a href={`/profile/${status.author}`} className={styles.download_btn_primary}>
											Open profile
										</a>
									</div>
								</section>
								<section className={styles.about_addon}>
									<span className={styles.addon_metadata_row}>
										<strong>Downloads: </strong>
										{status.downloads.toLocaleString()}
									</span>
								</section>
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.rpc_card_preview}>
								<StatusPreview
									username={status.author || 'User'}
									discriminator={`#${String(status.authorId ?? '').slice(0, 4) || '0001'}`}
									avatarSrc={avatarSrc}
									currentStatus={currentCycle}
									currentIndex={localIndex}
									config={status.configData}
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
									<DownloadJsonButton configId={status.id} />
									<CopyJsonButton configId={status.id} />
								</div>
							</div>
						</div>
					</div>

					<div className={styles.addon_details_left_column}>
						<StatusStructure status={status} />
					</div>
				</div>
			</div>
		</section>
	)
}
