'use client'

import { Book, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './button.module.scss'

export default function Button() {
	const [downloadUrl, setDownloadUrl] = useState('')
	const [loading, setLoading] = useState(true)
	const [isRedirecting, setIsRedirecting] = useState(false)
	const router = useRouter()

	useEffect(() => {
		async function fetchLatestRelease() {
			try {
				setLoading(true)
				const response = await fetch(
					'https://api.github.com/repos/Devollox/void-installer/releases/latest'
				)
				const release = await response.json()

				const exeAsset = release.assets?.find((asset: { name: string }) =>
					asset.name.toLowerCase().endsWith('.exe')
				)

				if (exeAsset) {
					setDownloadUrl(exeAsset.browser_download_url)
				}
			} catch (error) {
			} finally {
				setLoading(false)
			}
		}

		fetchLatestRelease()
	}, [])

	const handleDownloadClick = async (e: React.MouseEvent) => {
		if (!downloadUrl || isRedirecting) return

		e.preventDefault()
		setIsRedirecting(true)

		window.dispatchEvent(new CustomEvent('void-download-click'))

		try {
			await fetch('/api/v1/analytics/app', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'app_download', channel: 'installer' }),
			})
		} catch (error) {
		} finally {
			const link = document.createElement('a')
			link.href = downloadUrl
			link.style.display = 'none'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)

			router.push('/docs')
		}
	}

	return (
		<div className={`${styles.btn_container} ${styles.btn_width}`}>
			<button
				className={`${styles.btn} ${styles.btn_primary} ${
					loading || isRedirecting ? styles.disabled : ''
				}`}
				id='hero-download-button'
				disabled={loading || !downloadUrl || isRedirecting}
				onClick={handleDownloadClick}
			>
				<Download size={18} color='#000000' />
				<span>{loading || isRedirecting ? 'Install Now' : 'Install Now'}</span>
			</button>

			<a href='/presence'>
				<button className={`${styles.btn} ${styles.btn_secondary}`} id='hero-community-button'>
					<Book size={18} />
					<span>Configs</span>
				</button>
			</a>
		</div>
	)
}
