'use client'

import { Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from './download.module.scss'

interface ReleaseAsset {
	name: string
	size: number
	downloadUrl: string
}

interface Props {
	assets?: ReleaseAsset[]
}

export default function DownloadButtons({ assets }: Props) {
	const router = useRouter()

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

	const getDisplayName = (filename: string) => {
		const lastDotIndex = filename.lastIndexOf('.')
		if (lastDotIndex === -1) return filename

		const base = filename.slice(0, lastDotIndex)
		const ext = filename.slice(lastDotIndex)

		const withoutPlatformOrSetup = base.replace(
			/-win32-x64-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/i,
			''
		)

		const cleanedBase = withoutPlatformOrSetup.replace(
			/\.[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/i,
			''
		)

		return cleanedBase + ext
	}

	return (
		<div className={styles.assets_list}>
			{assets?.map(asset => (
				<button
					key={asset.name}
					className={styles.download_btn_primary}
					onClick={() => handleDownload(asset)}
				>
					<div className={styles.asset_info}>
						<span className={styles.asset_name}>{getDisplayName(asset.name)}</span>
						<span className={styles.asset_size}>{asset.size.toFixed(1)} MB</span>
					</div>
					<div className={styles.asset_action}>
						<Download size={16} color='#f1f1f1' />
						<span className={styles.asset_action_text}>Download</span>
					</div>
				</button>
			))}
		</div>
	)
}
