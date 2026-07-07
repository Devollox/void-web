'use client'

import type { Status } from '@/service/firebase'
import StatusPreview from '@components/statuses-preview/status-user'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
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
	const [deleting, setDeleting] = useState(false)
	const [deleted, setDeleted] = useState(false)

	const { data: session } = useSession()

	useEffect(() => {
		let cancelled = false
		let eventSource: EventSource | null = null

		async function loadInitialStatus() {
			try {
				const res = await fetch(`/api/v1/configs/${statusId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ kind: 'status' }),
				})

				if (!res.ok) {
					if (!cancelled) setStatus(null)
					return false
				}

				const data = (await res.json()) as Status
				if (!cancelled) setStatus(data)
				return true
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		async function startStream() {
			const ok = await loadInitialStatus()
			if (!ok || cancelled) return

			eventSource = new EventSource(`/api/v1/configs/${statusId}/stream?kind=status`)

			eventSource.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Status
				setStatus(next)
			})

			eventSource.addEventListener('update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as Status
				setStatus(next)
			})

			eventSource.addEventListener('not-found', () => {
				if (cancelled) return
				setStatus(null)
				setDeleted(true)
			})
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
	}, [statusId])

	const isOwnerClient = useMemo(() => {
		if (!status) return false
		if (!session?.user?.id || !session.user.name) return false

		const tag = String(status.authorTag ?? '').padStart(4, '0')
		const sessionIdStartsWithTag = session.user.id.startsWith(tag)
		const sameName = session.user.name === status.author

		return sessionIdStartsWithTag && sameName
	}, [status, session?.user?.id, session?.user?.name])

	const isOwn = !!status && ((status as any).isOwn === true || isOwnerClient)

	const handleDelete = async () => {
		if (!status) return
		if (deleting) return
		if (!isOwn) return

		setDeleting(true)
		try {
			const res = await fetch(
				`/api/v1/configs/${encodeURIComponent(String(status.id))}/delete?kind=status`,
				{
					method: 'DELETE',
				}
			)

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				throw new Error(data?.message || `Failed to delete status (${res.status})`)
			}

			setDeleted(true)
			setStatus(null)
		} catch {
		} finally {
			setDeleting(false)
		}
	}

	if (loading) {
		return (
			<section id='addon-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div
						className={`${styles.addon_splitview_container_statuses} ${styles.addon_splitview_container}`}
					>
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
						<div style={{ height: '160px' }} className={styles.addon_details_middle_column}>
							<div style={{ height: '160px' }} className={styles.skel_rpc} />
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

	if (!status || deleted) {
		return (
			<section id='status-details' className={styles.page_section}>
				<div className={styles.theme_view_panel}>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/statuses' className={styles.back_link}>
									← Back to Statuses
								</a>
								<h1 className={styles.title}>{deleted ? 'Status deleted' : 'Status not found'}</h1>
								<div className={styles.title_description}>
									{deleted
										? 'This status was deleted.'
										: 'This status may have been removed or is not available.'}
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
		} catch {}
	}

	return (
		<section id='status-details' className={styles.page_section}>
			<div className={styles.theme_view_panel}>
				<div>
					<div
						className={`${styles.addon_splitview_container_statuses} ${styles.addon_splitview_container}`}
					>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/statuses' className={styles.back_link}>
									← Back to Statuses
								</a>
								<h1 className={styles.title}>{status.title}</h1>
								<div className={styles.title_description}>{status.description}</div>
								<section className={styles.addon_actions}>
									<div className={styles.btn_container}>
										<a
											href={`/profile/${encodeURIComponent(status.author)}?tag=${encodeURIComponent(
												String(status.authorTag ?? '').padStart(4, '0')
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
										{status.downloads.toLocaleString()}
									</span>
								</section>
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.rpc_card_preview}>
								<StatusPreview
									username={status.author || 'User'}
									discriminator={`#${String(status.authorTag ?? '') || '0001'}`}
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
									Export or share this Discord Rich Presence status.
								</p>
								<div className={styles.actions_buttons}>
									<a className={styles.action_btn_primary} onClick={handleOpenInApp}>
										Open in app
										<span className={styles.action_btn_hint}>import .json</span>
									</a>
									<DownloadJsonButton configId={status.id} />
									<CopyJsonButton configId={status.id} />
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
						<StatusStructure status={status} />
					</div>
				</div>
			</div>
		</section>
	)
}
