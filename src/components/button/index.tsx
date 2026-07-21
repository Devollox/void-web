'use client'

import { Book, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './button.module.scss'

type OsPlatform = 'windows' | 'macos' | 'linux'

interface ReleaseAsset {
	name: string
	browser_download_url: string
}

interface GithubRelease {
	assets?: ReleaseAsset[]
}

function detectPlatform(): OsPlatform {
	if (typeof navigator === 'undefined') return 'windows'
	const ua = navigator.userAgent.toLowerCase()
	if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos'
	if (ua.includes('linux') && !ua.includes('android')) return 'linux'
	return 'windows'
}

function pickAssetForPlatform(
	platform: OsPlatform,
	installerRelease: GithubRelease,
	appRelease: GithubRelease
): string | null {
	const installerAssets = installerRelease.assets || []
	const appAssets = appRelease.assets || []

	if (platform === 'windows') {
		const exeAsset =
			installerAssets.find(a => a.name.toLowerCase().endsWith('.exe')) ||
			appAssets.find(a => a.name.toLowerCase().endsWith('.exe'))
		return exeAsset?.browser_download_url ?? null
	}

	if (platform === 'macos') {
		const dmgAsset = appAssets.find(a => a.name.toLowerCase().endsWith('.dmg'))
		return dmgAsset?.browser_download_url ?? null
	}

	const debAsset = appAssets.find(a => a.name.toLowerCase().endsWith('.deb'))
	return debAsset?.browser_download_url ?? null
}

export default function Button() {
	const [downloadUrl, setDownloadUrl] = useState('')
	const [loading, setLoading] = useState(true)
	const [isRedirecting, setIsRedirecting] = useState(false)
	const router = useRouter()

	useEffect(() => {
		async function fetchLatest() {
			try {
				setLoading(true)
				const platform = detectPlatform()

				const [installerRes, appRes] = await Promise.all([
					fetch('https://api.github.com/repos/Devollox/void-installer/releases/latest'),
					fetch('https://api.github.com/repos/Devollox/void-presence/releases/latest'),
				])

				const installerRelease: GithubRelease = await installerRes.json()
				const appRelease: GithubRelease = await appRes.json()

				const url = pickAssetForPlatform(platform, installerRelease, appRelease)
				if (url) setDownloadUrl(url)
			} catch {
			} finally {
				setLoading(false)
			}
		}

		fetchLatest()
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
		} catch {
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
