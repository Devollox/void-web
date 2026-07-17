'use client'

import type { Plugin } from '@service/firebase'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import StatusPreview from '../statuses-preview/status-user'
import gridStyles from './activity-grid.module.scss'

const FALLBACK_AVATAR = '/logo.png'

function PluginCardPreview({ plugin, previewIndex }: { plugin: Plugin; previewIndex: number }) {
	const slides: string[] = plugin.preview?.slides?.length
		? plugin.preview.slides
		: ([plugin.preview?.details, plugin.preview?.state].filter(Boolean) as string[])

	const statusCycles = slides.map(text => ({ text }))
	const maxLen = statusCycles.length || 1
	const localIndex = maxLen ? previewIndex % maxLen : 0
	const currentStatus = statusCycles[localIndex] ?? { text: '' }

	return (
		<div className={`${gridStyles.statuses_card_preview} ${gridStyles.rpc_card_preview}`}>
			<div className={gridStyles.rpc_card_preview_inner}>
				<StatusPreview
					username={plugin.author || 'Plugin'}
					currentStatus={currentStatus}
					currentIndex={localIndex}
					config={{ statusCycles }}
					avatarSrc={plugin.authorAvatar || FALLBACK_AVATAR}
					activityType={plugin.preview?.activityType ?? 'playing'}
				/>
			</div>
		</div>
	)
}

function PluginCard({ plugin, previewIndex }: { plugin: Plugin; previewIndex: number }) {
	const handleInstall = () => {
		const isFolder = (plugin as any).folder === true
		const param = isFolder ? 'zip' : 'url'
		window.location.href = `voidpresence://install-plugin?${param}=${encodeURIComponent(plugin.sourceUrl)}`
		fetch('/api/v1/analytics/configs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 'plugin_download', id: plugin.id }),
		}).catch(() => {})
	}

	const rawDownloads = (plugin as any).downloads
	const downloads =
		typeof rawDownloads === 'number' ? rawDownloads : parseInt(String(rawDownloads ?? '0')) || 0

	return (
		<div className={gridStyles.card_wrap}>
			<div className={gridStyles.card}>
				<div className={gridStyles.card_header}>
					<div>
						<h3 className={gridStyles.card_title}>{plugin.title}</h3>
						<div className={gridStyles.card_author}>
							by <span>{plugin.author}</span>
						</div>
					</div>
					<div className={gridStyles.download_tag}>
						<Download size={14} className={gridStyles.download_icon} />
						<span className={gridStyles.download_text}>{downloads.toLocaleString()}</span>
					</div>
				</div>

				<PluginCardPreview plugin={plugin} previewIndex={previewIndex} />

				<div className={gridStyles.card_actions}>
					<div className={gridStyles.card_buttons}>
						<button className={gridStyles.btn_primary} onClick={handleInstall}>
							Install in app
						</button>
						<a
							className={gridStyles.btn_secondary}
							href={plugin.sourceUrl}
							target='_blank'
							rel='noopener noreferrer'
						>
							Source
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}

export function PluginsGrid({ plugins }: { plugins: Plugin[] }) {
	const [previewTick, setPreviewTick] = useState(0)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		const i = setInterval(() => setPreviewTick(p => p + 1), 3000)
		return () => clearInterval(i)
	}, [])

	if (!plugins.length) {
		return (
			<div className={gridStyles.empty_state}>
				<p>No plugins found.</p>
			</div>
		)
	}

	return (
		<section className={gridStyles.page_section}>
			<div className={gridStyles.cards_grid}>
				{plugins.map((plugin, index) => (
					<PluginCard
						key={plugin.id}
						plugin={plugin}
						previewIndex={mounted ? previewTick + index : 0}
					/>
				))}
			</div>
		</section>
	)
}
