'use client'

import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import { signIn } from 'next-auth/react'
import styles from './signin.module.scss'

type Provider = 'google' | 'discord' | 'steam' | 'github'

function getRedirectTo(): string {
	const params = new URLSearchParams(window.location.search)
	const callbackUrl = params.get('callbackUrl')

	if (!callbackUrl) return '/profile'

	try {
		const target = new URL(callbackUrl, window.location.origin)

		if (target.origin !== window.location.origin) {
			return '/profile'
		}

		if (target.pathname === '/api/desktop/connect' || target.pathname === '/desktop/connect') {
			return '/api/desktop/connect'
		}

		if (target.pathname === '/profile' && target.searchParams.get('desktop') === 'connect') {
			return '/api/desktop/connect'
		}
	} catch {
		return '/profile'
	}

	return '/profile'
}

export function SignInPageClient() {
	const handleSignIn = (provider: Provider) => {
		const redirectTo = getRedirectTo()

		void signIn(provider, {
			redirectTo,
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
