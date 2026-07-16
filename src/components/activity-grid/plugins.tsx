'use client'

import type { Plugin } from '@service/firebase'
import { Download } from 'lucide-react'
import styles from '../../app/(site)/plugins/plugins.module.scss'

type Props = {
	plugins: Plugin[]
}

function PluginCard({ plugin }: { plugin: Plugin }) {
	const handleInstall = () => {
		window.location.href = `voidpresence://install-plugin?url=${encodeURIComponent(
			plugin.sourceUrl
		)}`
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
		<div className={styles.card_wrap}>
			<div className={styles.card}>
				<div className={styles.card_header}>
					<div>
						<h3 className={styles.card_title}>{plugin.title}</h3>
						<div className={styles.card_author}>
							by <span>{plugin.author}</span>
						</div>
					</div>
					<div className={styles.card_meta}>
						<div className={styles.download_tag}>
							<Download size={14} className={styles.download_icon} />
							<span className={styles.download_text}>{downloads.toLocaleString()}</span>
						</div>
					</div>
				</div>

				<div className={styles.plugin_preview}>
					{plugin.preview && (
						<div className={styles.plugin_preview_rpc}>
							{plugin.preview.details && (
								<div className={styles.preview_details}>{plugin.preview.details}</div>
							)}

							{plugin.preview.state && (
								<div className={styles.preview_state}>{plugin.preview.state}</div>
							)}
						</div>
					)}
				</div>

				<p className={styles.card_description}>{plugin.description}</p>

				{plugin.tags && plugin.tags.length > 0 && (
					<div className={styles.tags}>
						{plugin.tags.map(tag => (
							<span key={tag} className={styles.tag}>
								{tag}
							</span>
						))}
					</div>
				)}

				<div className={styles.card_actions}>
					<div className={styles.card_buttons}>
						<button className={styles.btn_primary} onClick={handleInstall}>
							Install in app
						</button>
						<a
							className={styles.btn_secondary}
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

export function PluginsGrid({ plugins }: Props) {
	if (!plugins.length) {
		return (
			<div className={styles.empty_state}>
				<p>No plugins found.</p>
			</div>
		)
	}

	return (
		<section className={styles.page_section}>
			<div className={styles.cards_grid}>
				{plugins.map(plugin => (
					<PluginCard key={plugin.id} plugin={plugin} />
				))}
			</div>
		</section>
	)
}
