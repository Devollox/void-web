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

function pickAssetsForPlatform(platform: OsPlatform, assets: ReleaseAsset[]) {
	const n = (s: string) => s.toLowerCase()

	const setup =
		platform === 'windows'
			? assets.find(a => n(a.name).endsWith('.exe') && n(a.name).includes('.setup.'))
			: platform === 'macos'
				? assets.find(a => n(a.name).endsWith('.dmg'))
				: assets.find(a => n(a.name).endsWith('.deb')) ||
					assets.find(a => n(a.name).endsWith('.rpm'))

	const portable =
		platform === 'windows'
			? assets.find(a => n(a.name).includes('.windows.') && n(a.name).endsWith('.zip')) ||
				assets.find(a => n(a.name).endsWith('.zip'))
			: platform === 'macos'
				? assets.find(a => n(a.name).includes('.macos.') && n(a.name).endsWith('.zip')) ||
					assets.find(a => n(a.name).endsWith('.zip'))
				: assets.find(a => n(a.name).includes('.linux.') && n(a.name).endsWith('.zip')) ||
					assets.find(a => n(a.name).endsWith('.zip'))

	const result: ReleaseAsset[] = []
	if (setup) result.push(setup)
	if (portable && portable.name !== setup?.name) result.push(portable)
	return result
}

function getDisplayName(filename: string): string {
	return filename
		.replace(/\.[0-9]+\.[0-9]+\.[0-9]+(?=\.)/i, '')
		.replace(/\.(windows|macos|linux)(?=\.)/i, '')
		.replace(/-win32-x64-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?/i, '')
}

export default function DownloadButtons({ assets }: Props) {
	const router = useRouter()
	const platform = useMemo(detectPlatform, [])

	const selectedAssets = useMemo(() => {
		if (!assets) return []
		return pickAssetsForPlatform(platform, assets)
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

	if (selectedAssets.length === 0) return null

	return (
		<div className={styles.assets_list}>
			{selectedAssets.map((asset, idx) => (
				<button
					key={asset.name}
					className={
						idx === 0
							? `${styles.download_btn_primary} ${styles.download_btn_highlighted}`
							: styles.download_btn_primary
					}
					onClick={() => handleDownload(asset)}
					title={asset.name}
				>
					<div className={styles.asset_info}>
						<span className={styles.asset_name}>{getDisplayName(asset.name)}</span>
						<span className={styles.asset_size}>{asset.size.toFixed(1)} MB</span>
					</div>
					<div className={styles.asset_action}>
						<Download size={16} color='#f1f1f1' />
					</div>
				</button>
			))}
		</div>
	)
}
