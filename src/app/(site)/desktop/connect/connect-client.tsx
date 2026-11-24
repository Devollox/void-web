'use client'

import { useEffect, useState } from 'react'
import styles from './desktop-connect.module.scss'

type Props = {
	authorID: number | string
	name?: string | null
	provider?: string | null
	avatar?: string | null
}

type ConnectionParams = {
	state: string
	code_challenge: string
	code_challenge_method: 'S256'
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readConnectionParams(params: URLSearchParams): ConnectionParams | null {
	const keys = ['state', 'code_challenge', 'code_challenge_method']

	if (keys.some(key => params.getAll(key).length !== 1)) {
		return null
	}

	const state = params.get('state')
	const challenge = params.get('code_challenge')
	const method = params.get('code_challenge_method')

	if (!state || !/^[A-Za-z0-9_-]{43,128}$/.test(state)) return null
	if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return null
	if (method !== 'S256') return null

	return {
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
	}
}

function validateDeepLink(value: unknown, expectedState: string): string | null {
	if (typeof value !== 'string') return null

	try {
		const url = new URL(value)

		if (url.protocol !== 'voidpresence:') return null
		if (url.hostname !== 'auth') return null
		if (url.username || url.password || url.port || url.hash) return null
		if (url.pathname !== '' && url.pathname !== '/') return null

		const allowedKeys = new Set(['ticket', 'state'])

		for (const key of url.searchParams.keys()) {
			if (!allowedKeys.has(key)) return null
		}

		if (url.searchParams.getAll('ticket').length !== 1) return null
		if (url.searchParams.getAll('state').length !== 1) return null
		if (url.searchParams.get('state') !== expectedState) return null

		const ticket = url.searchParams.get('ticket')

		if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null

		return url.toString()
	} catch {
		return null
	}
}

export default function DesktopConnect({ authorID, name, provider, avatar }: Props) {
	const [isConnectPage, setIsConnectPage] = useState(false)
	const [connection, setConnection] = useState<ConnectionParams | null>(null)
	const [loading, setLoading] = useState(false)
	const [attempted, setAttempted] = useState(false)
	const [avatarFailed, setAvatarFailed] = useState(false)
	const [error, setError] = useState('')
	const [deepLink, setDeepLink] = useState('')
	const [expiresAt, setExpiresAt] = useState(0)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const isConnect = params.get('desktop') === 'connect'

		setIsConnectPage(isConnect)

		if (!isConnect) return

		const binding = readConnectionParams(params)

		setConnection(binding)

		if (!binding) {
			setError('This connection link is invalid. Start login again from the desktop app.')
		}
	}, [])

	const displayName = name?.trim() || 'Void Presence'
	const avatarUrl = getAvatarUrl(avatar)
	const authorId = String(authorID ?? '').trim()
	const providerName =
		provider?.toLowerCase() === 'discord' ? 'Discord' : provider?.trim() || 'Connected profile'

	useEffect(() => {
		setAvatarFailed(false)
	}, [avatarUrl])

	useEffect(() => {
		if (!deepLink || !expiresAt) return

		const timer = window.setTimeout(
			() => {
				setDeepLink('')
				setExpiresAt(0)
			},
			Math.max(0, expiresAt - Date.now())
		)

		return () => {
			window.clearTimeout(timer)
		}
	}, [deepLink, expiresAt])

	const prepareConnection = async (): Promise<void> => {
		if (loading || !connection || !authorId) return

		setLoading(true)
		setError('')
		setDeepLink('')
		setExpiresAt(0)

		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 15_000)

		try {
			const response = await fetch('/api/auth/desktop/ticket', {
				method: 'POST',
				credentials: 'same-origin',
				cache: 'no-store',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify(connection),
				signal: controller.signal,
			})

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Your website session expired. Start login again from the desktop app.')
				}

				if (response.status === 403) {
					throw new Error(
						'The connection request was rejected. Start login again from the desktop app.'
					)
				}

				throw new Error('Could not create a connection link. Please try again.')
			}

			const payload: unknown = await response.json()

			if (!isRecord(payload)) {
				throw new Error('The server returned an invalid response.')
			}

			const link = validateDeepLink(payload.deepLink, connection.state)

			if (!link) {
				throw new Error('The server returned an invalid connection link.')
			}

			if (
				typeof payload.expiresIn !== 'number' ||
				!Number.isFinite(payload.expiresIn) ||
				payload.expiresIn <= 0 ||
				payload.expiresIn > 60
			) {
				throw new Error('The server returned an invalid connection lifetime.')
			}

			setDeepLink(link)
			setExpiresAt(Date.now() + payload.expiresIn * 1000)
			setAttempted(true)

			window.location.assign(link)
		} catch (caught) {
			setError(
				caught instanceof Error && caught.name === 'AbortError'
					? 'The server took too long to respond. Please try again.'
					: caught instanceof Error
						? caught.message
						: 'Could not connect to the desktop app.'
			)
		} finally {
			window.clearTimeout(timeout)
			setLoading(false)
		}
	}

	if (!isConnectPage) return null

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

				{authorId && connection ? (
					deepLink ? (
						<a
							href={deepLink}
							className={styles.primary}
							onClick={event => {
								if (Date.now() >= expiresAt) {
									event.preventDefault()
									setDeepLink('')
									setExpiresAt(0)
									setError('The connection link expired. Generate a new one.')
									return
								}

								setAttempted(true)
							}}
						>
							Open Void Presence again
						</a>
					) : (
						<button
							type='button'
							className={styles.primary}
							disabled={loading}
							aria-busy={loading}
							onClick={() => {
								void prepareConnection()
							}}
						>
							{loading ? 'Preparing connection…' : 'Open Void Presence'}

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
						</button>
					)
				) : !authorId ? (
					<p className={styles.error} role='alert'>
						Your author ID is not available. Return to your profile and try again.
					</p>
				) : null}

				{error ? (
					<p className={styles.error} role='alert'>
						{error}
					</p>
				) : null}

				<p className={styles.feedback} role='status' aria-live='polite'>
					{attempted
						? 'Confirm the browser prompt to open the app. If it did not appear, click Open Void Presence again. This page cannot confirm whether the app connected successfully.'
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
