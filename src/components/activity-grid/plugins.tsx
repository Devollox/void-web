'use client'

import type { Plugin } from '@/services/firebase'
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
					discriminator=''
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
	const [installState, setInstallState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
	const [installLink, setInstallLink] = useState('')
	const [installExpiresAt, setInstallExpiresAt] = useState(0)
	const [installError, setInstallError] = useState('')

	useEffect(() => {
		if (!installLink || !installExpiresAt) return
		const timer = window.setTimeout(
			() => {
				setInstallLink('')
				setInstallExpiresAt(0)
				setInstallState('idle')
			},
			Math.max(0, installExpiresAt - Date.now())
		)
		return () => window.clearTimeout(timer)
	}, [installLink, installExpiresAt])

	const handleInstall = async () => {
		if (installState === 'loading') return
		setInstallState('loading')
		setInstallError('')

		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 15_000)

		try {
			const res = await fetch('/api/action/ticket', {
				method: 'POST',
				credentials: 'same-origin',
				cache: 'no-store',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ kind: 'install-plugin', id: plugin.id }),
				signal: controller.signal,
			})

			if (!res.ok) {
				throw new Error(
					res.status === 404
						? 'Plugin not found on the server.'
						: 'Could not prepare the install link. Please try again.'
				)
			}

			const data = (await res.json()) as { deepLink?: unknown; expiresIn?: unknown }

			if (
				typeof data.deepLink !== 'string' ||
				!data.deepLink.startsWith('voidpresence://action?')
			) {
				throw new Error('The server returned an invalid link.')
			}

			if (
				typeof data.expiresIn !== 'number' ||
				!Number.isFinite(data.expiresIn) ||
				data.expiresIn <= 0
			) {
				throw new Error('The server returned an invalid expiry.')
			}

			setInstallLink(data.deepLink)
			setInstallExpiresAt(Date.now() + data.expiresIn * 1000)
			setInstallState('ready')

			window.location.assign(data.deepLink)
		} catch (err) {
			setInstallError(
				err instanceof Error && err.name === 'AbortError'
					? 'The server took too long to respond. Please try again.'
					: err instanceof Error
						? err.message
						: 'Could not start installation.'
			)
			setInstallState('error')
		} finally {
			window.clearTimeout(timeout)
		}

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
					</div>
					<div className={gridStyles.download_tag}>
						<Download size={14} className={gridStyles.download_icon} />
						<span className={gridStyles.download_text}>{downloads.toLocaleString()}</span>
					</div>
				</div>

				<PluginCardPreview plugin={plugin} previewIndex={previewIndex} />

				<div className={gridStyles.card_actions}>
					<div className={gridStyles.card_buttons}>
						{installState === 'ready' && installLink ? (
							<button
								className={gridStyles.btn_primary}
								onClick={() => {
									if (Date.now() >= installExpiresAt) {
										setInstallLink('')
										setInstallExpiresAt(0)
										setInstallState('idle')
										return
									}
									window.location.assign(installLink)
								}}
							>
								Open Void Presence again
							</button>
						) : (
							<button
								className={gridStyles.btn_primary}
								disabled={installState === 'loading'}
								aria-busy={installState === 'loading'}
								onClick={() => void handleInstall()}
							>
								{installState === 'loading' ? 'Preparing…' : 'Install in app'}
							</button>
						)}
						<a
							className={gridStyles.btn_secondary}
							href={plugin.sourceUrl}
							target='_blank'
							rel='noopener noreferrer'
						>
							Source
						</a>
					</div>
					{installState === 'error' && installError && (
						<p
							role='alert'
							style={{ fontSize: '11px', color: 'var(--color-error, #f87171)', marginTop: '6px' }}
						>
							{installError}
						</p>
					)}
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
