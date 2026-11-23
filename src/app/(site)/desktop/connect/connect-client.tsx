'use client'

import { useEffect, useState } from 'react'
import styles from './desktop-connect.module.scss'

type Props = {
	authorID: number | string
	name?: string | null
	provider?: string | null
	avatar?: string | null
}

function getInitials(value: string): string {
	const words = value
		.replace(/[^\p{L}\p{N}\s]/gu, '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)

	if (!words.length) return 'VP'

	if (words.length === 1) {
		return Array.from(words[0]!).slice(0, 2).join('').toUpperCase()
	}

	return `${Array.from(words[0]!)[0] ?? ''}${Array.from(words[1]!)[0] ?? ''}`.toUpperCase()
}

function getAvatarUrl(value?: string | null): string {
	if (!value) return ''

	try {
		const url = new URL(value)

		if (url.protocol !== 'https:') return ''
		if (url.hostname !== 'cdn.discordapp.com') return ''
		if (url.username || url.password || url.port) return ''

		return url.href
	} catch {
		return ''
	}
}

export default function DesktopConnect({ authorID, name, provider, avatar }: Props) {
	const [isConnectPage, setIsConnectPage] = useState(false)
	const [attempted, setAttempted] = useState(false)
	const [avatarFailed, setAvatarFailed] = useState(false)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)

		setIsConnectPage(params.get('desktop') === 'connect')
	}, [])

	const displayName = name?.trim() || 'Void Presence'
	const avatarUrl = getAvatarUrl(avatar)
	const authorId = String(authorID ?? '').trim()
	const providerName =
		provider?.toLowerCase() === 'discord' ? 'Discord' : provider?.trim() || 'Connected profile'

	useEffect(() => {
		setAvatarFailed(false)
	}, [avatarUrl])

	if (!isConnectPage) return null

	const params = new URLSearchParams({
		authorId,
		name: name?.trim() || '',
		provider: provider?.trim() || '',
		avatar: avatarUrl,
	})

	const deepLink = `voidpresence://auth?${params.toString()}`

	return (
		<div className={styles.surface}>
			<main className={styles.card} aria-labelledby='desktop-connect-title'>
				<div className={styles.brand}>
					<span className={styles.brand_mark} aria-hidden='true'>
						VP
					</span>
					<span>Void Presence</span>
				</div>

				<h1 id='desktop-connect-title' className={styles.title}>
					Connect to the desktop app
				</h1>

				<p className={styles.description}>Use this profile in Void Presence on your device.</p>

				<div className={styles.profile}>
					<div className={styles.avatar} aria-hidden='true'>
						{avatarUrl && !avatarFailed ? (
							<img
								src={avatarUrl}
								alt=''
								referrerPolicy='no-referrer'
								onError={() => setAvatarFailed(true)}
							/>
						) : (
							<span>{getInitials(displayName)}</span>
						)}
					</div>

					<div className={styles.profile_info}>
						<span className={styles.name}>{displayName}</span>
						<span className={styles.provider}>{providerName}</span>
					</div>
				</div>

				{authorId ? (
					<a href={deepLink} className={styles.primary} onClick={() => setAttempted(true)}>
						{attempted ? 'Open Void Presence again' : 'Open Void Presence'}

						<svg
							width='15'
							height='15'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='1.5'
							strokeLinecap='round'
							strokeLinejoin='round'
							aria-hidden='true'
						>
							<path d='M15 3h6v6M10 14 21 3' />
							<path d='M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5' />
						</svg>
					</a>
				) : (
					<p className={styles.error} role='alert'>
						Your author ID is not available. Return to your profile and try again.
					</p>
				)}

				<p className={styles.feedback} role='status' aria-live='polite'>
					{attempted
						? 'Confirm the browser prompt to open the app. You can close this page after your profile appears in Void Presence.'
						: 'Your browser may ask for permission to open Void Presence.'}
				</p>

				<div className={styles.footer}>
					<a href='/download' className={styles.link}>
						Download the app
					</a>

					<a href='/profile' className={styles.link}>
						Back to profile
					</a>
				</div>
			</main>
		</div>
	)
}
