'use client'

import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import { getSession, signIn } from 'next-auth/react'
import { useEffect } from 'react'
import styles from './signin.module.scss'

type Provider = 'google' | 'discord' | 'steam' | 'github'

const DESKTOP_CONNECT_PATH = '/api/auth/desktop/connect'

function getRedirectTo(): string {
	const params = new URLSearchParams(window.location.search)

	if (params.getAll('callbackUrl').length !== 1) {
		return '/profile'
	}

	const callbackUrl = params.get('callbackUrl')

	if (!callbackUrl) return '/profile'

	try {
		const target = new URL(callbackUrl, window.location.origin)

		if (target.username || target.password || target.hash) {
			return '/profile'
		}

		const isSiteOrigin = target.origin === window.location.origin
		const isApiOrigin = target.origin === 'https://api.voidpresence.com'

		if (!isSiteOrigin && !isApiOrigin) {
			return '/profile'
		}

		const isDesktopConnectPath = [
			DESKTOP_CONNECT_PATH,
			'/auth/desktop',
			'/auth/desktop/connect',
			'/desktop/connect',
			'/api/desktop/connect',
			'/api/v1/desktop/connect',
		].includes(target.pathname)

		const isDesktopProfile =
			isSiteOrigin &&
			target.pathname === '/profile' &&
			target.searchParams.getAll('desktop').length === 1 &&
			target.searchParams.get('desktop') === 'connect'

		if (!isDesktopConnectPath && !isDesktopProfile) {
			return '/profile'
		}

		const keys = ['state', 'code_challenge', 'code_challenge_method']

		if (keys.some(key => target.searchParams.getAll(key).length !== 1)) {
			return '/profile'
		}

		const state = target.searchParams.get('state')
		const challenge = target.searchParams.get('code_challenge')
		const method = target.searchParams.get('code_challenge_method')

		if (!state || !/^[A-Za-z0-9_-]{43,128}$/.test(state)) {
			return '/profile'
		}

		if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
			return '/profile'
		}

		if (method !== 'S256') {
			return '/profile'
		}

		const destination = new URL(DESKTOP_CONNECT_PATH, window.location.origin)

		destination.searchParams.set('state', state)
		destination.searchParams.set('code_challenge', challenge)
		destination.searchParams.set('code_challenge_method', 'S256')

		return `${destination.pathname}${destination.search}`
	} catch {
		return '/profile'
	}
}

export function SignInPageClient() {
	useEffect(() => {
		let cancelled = false
		let redirecting = false

		const checkSession = async (): Promise<void> => {
			try {
				const session = await getSession()

				if (cancelled || redirecting || !session?.user) return

				redirecting = true
				window.location.replace(getRedirectTo())
			} catch (error) {
				console.error('[signin:session]', error)
			}
		}

		void checkSession()

		const handleFocus = (): void => {
			void checkSession()
		}

		const handleVisibility = (): void => {
			if (document.visibilityState === 'visible') {
				void checkSession()
			}
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibility)

		return () => {
			cancelled = true
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibility)
		}
	}, [])

	const handleSignIn = (provider: Provider) => {
		void signIn(provider, {
			redirectTo: getRedirectTo(),
		})
	}

	const left = (
		<>
			<InfoBox
				variant='secondary'
				title="Don't have the app yet?"
				lines={[
					'Download the latest Void Presence build and start customizing your Discord activity.',
				]}
				linkHref='/download'
				linkLabel='Go to download page'
			/>

			<InfoBox
				title='Choose a provider to continue'
				lines={['You can disconnect at any time in your account settings.']}
			/>
		</>
	)

	const right = (
		<section className={styles.page_section}>
			<div className={layoutStyles.preview_card_wrap}>
				<div className={layoutStyles.preview_card}>
					<div className={layoutStyles.preview_header}>
						<h3 className={layoutStyles.preview_title}>Sign in</h3>

						<div className={layoutStyles.preview_badge}>
							<span className={layoutStyles.preview_badge_text}>Secure OAuth</span>
						</div>
					</div>

					<div className={styles.providers_list}>
						<button
							type='button'
							className={styles.signin_btn_primary}
							onClick={() => handleSignIn('google')}
						>
							<span className={styles.asset_info}>
								<span className={styles.asset_name}>Sign in with Google</span>
								<span className={styles.asset_size}>Use your Google account</span>
							</span>

							<span className={styles.asset_action_text}>Continue</span>
						</button>

						<button
							type='button'
							className={styles.signin_btn_primary}
							onClick={() => handleSignIn('discord')}
						>
							<span className={styles.asset_info}>
								<span className={styles.asset_name}>Sign in with Discord</span>
								<span className={styles.asset_size}>Use your Discord account</span>
							</span>

							<span className={styles.asset_action_text}>Continue</span>
						</button>

						<button
							type='button'
							className={styles.signin_btn_primary}
							onClick={() => handleSignIn('steam')}
						>
							<span className={styles.asset_info}>
								<span className={styles.asset_name}>Sign in with Steam</span>
								<span className={styles.asset_size}>Use your Steam account</span>
							</span>

							<span className={styles.asset_action_text}>Continue</span>
						</button>

						<button
							type='button'
							className={styles.signin_btn_primary}
							onClick={() => handleSignIn('github')}
						>
							<span className={styles.asset_info}>
								<span className={styles.asset_name}>Sign in with GitHub</span>
								<span className={styles.asset_size}>Use your GitHub account</span>
							</span>

							<span className={styles.asset_action_text}>Continue</span>
						</button>
					</div>

					<p className={layoutStyles.secondary_text}>
						We only use your account to authenticate you and sync your configs. You can revoke
						access from your provider&apos;s settings at any time.
					</p>
				</div>
			</div>
		</section>
	)

	return (
		<Page>
			<PageHeader
				title='Sign in to Void Presence'
				subtitle='Connect your account to manage profiles, status cycles and Discord Rich Presence.'
			/>

			<PanelLayout left={left} right={right} />

			<Footer />
		</Page>
	)
}
