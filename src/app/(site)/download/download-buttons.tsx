'use client'

import { Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import styles from './download.module.scss'

interface ReleaseAsset {
	name: string
	size: number
	downloadUrl: string
}

interface Props {
	assets?: ReleaseAsset[]
}

type OsPlatform = 'windows' | 'macos' | 'linux'

function detectPlatform(): OsPlatform {
	if (typeof navigator === 'undefined') return 'windows'
	const ua = navigator.userAgent.toLowerCase()
	if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos'
	if (ua.includes('linux') && !ua.includes('android')) return 'linux'
	return 'windows'
}

function assetPriority(name: string, platform: OsPlatform): number {
	const n = name.toLowerCase()

	switch (platform) {
		case 'macos':
			if (n.endsWith('.dmg')) return 0
			if (n.includes('.macos.') && n.endsWith('.zip')) return 1
			if (n.endsWith('.zip')) return 2
			return 10
		case 'linux':
			if (n.endsWith('.deb')) return 0
			if (n.endsWith('.rpm')) return 1
			if (n.endsWith('.linux') || n.includes('.linux.')) return 2
			if (n.endsWith('.zip')) return 3
			return 10
		default:
			if (n.endsWith('.exe')) return 0
			if (n.endsWith('.zip')) return 1
			return 10
	}
}

function getDisplayName(filename: string): string {
	const lastDot = filename.lastIndexOf('.')
	if (lastDot === -1) return filename

	const base = filename.slice(0, lastDot)
	const ext = filename.slice(lastDot)

	const stripped = base
		.replace(/-win32-x64-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/i, '')
		.replace(/\.[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/i, '')
		.replace(/\.(amd64|x86_64|arm64|universal)$/i, '')
		.replace(/\.(macos|linux)$/i, '')

	return stripped + ext
}

function platformBadgeLabel(platform: OsPlatform): string {
	switch (platform) {
		case 'macos':
			return 'macOS'
		case 'linux':
			return 'Linux'
		default:
			return 'Windows'
	}
}

export default function DownloadButtons({ assets }: Props) {
	const router = useRouter()
	const platform = useMemo(detectPlatform, [])

	const sorted = useMemo(() => {
		if (!assets) return []
		return [...assets].sort(
			(a, b) => assetPriority(a.name, platform) - assetPriority(b.name, platform)
		)
	}, [assets, platform])

	const handleDownload = async (asset: ReleaseAsset) => {
		try {
			await fetch('/api/v1/analytics/app', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'app_download', channel: 'docs' }),
			})
		} catch {
		} finally {
			const link = document.createElement('a')
			link.href = asset.downloadUrl
			link.download = asset.name
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)

			setTimeout(() => {
				router.push('/docs')
			}, 1)
		}
	}

	return (
		<div className={styles.assets_list}>
			{sorted.map((asset, idx) => {
				const isPrimary = idx === 0
				return (
					<button
						key={asset.name}
						className={
							isPrimary
								? `${styles.download_btn_primary} ${styles.download_btn_highlighted}`
								: styles.download_btn_primary
						}
						onClick={() => handleDownload(asset)}
						title={asset.name}
					>
						<div className={styles.asset_info}>
							<span className={styles.asset_name}>
								{getDisplayName(asset.name)}
								{isPrimary && (
									<span className={styles.platform_badge}>{platformBadgeLabel(platform)}</span>
								)}
							</span>
							<span className={styles.asset_size}>{asset.size.toFixed(1)} MB</span>
						</div>
						<div className={styles.asset_action}>
							<Download size={16} color='#f1f1f1' />
							<span className={styles.asset_action_text}>Download</span>
						</div>
					</button>
				)
			})}
		</div>
	)
}
