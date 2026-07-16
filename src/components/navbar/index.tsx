'use client'

import { UserPen } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './navbar.module.scss'

let MAIN_SITE_ORIGIN = 'https://voidpresence.site'

export default function Navbar({ isApiHost }: { isApiHost?: boolean }) {
	const { data: session, status } = useSession()
	const isAuth = status === 'authenticated' && !!session?.user

	return (
		<header className={styles.navbar_root}>
			<div className={styles.navbar_shell}>
				<a href={isApiHost ? '/' : MAIN_SITE_ORIGIN} className={styles.navbar_brand}>
					<div className={styles.navbar_logo_mark}>vP</div>
					<div className={styles.navbar_brand_text}>
						<span className={styles.navbar_brand_title}>Void Presence</span>
						<span className={styles.navbar_brand_subtitle}>Discord Rich Presence manager</span>
					</div>
				</a>

				<nav className={styles.navbar_nav}>
					{!isApiHost && (
						<>
							{' '}
							<a className={styles.nav_link} href={`${MAIN_SITE_ORIGIN}/download`}>
								Download
							</a>
							<a className={styles.nav_link} href={`${MAIN_SITE_ORIGIN}/docs`}>
								Docs
							</a>
						</>
					)}
					{!isApiHost && (
						<div className={styles.nav_configs_group}>
							<div className={`${styles.nav_button} ${styles.nav_link} ${styles.nav_link_configs}`}>
								Configs
							</div>
							<div className={styles.nav_configs_dropdown}>
								<a className={styles.nav_configs_item} href={`${MAIN_SITE_ORIGIN}/presence`}>
									Presence
								</a>
								<a className={styles.nav_configs_item} href={`${MAIN_SITE_ORIGIN}/statuses`}>
									Statuses
								</a>
								<a className={styles.nav_configs_item} href={`${MAIN_SITE_ORIGIN}/plugins`}>
									Plugins
								</a>
							</div>
						</div>
					)}
					{!isApiHost && (
						<div className={styles.nav_schedule_group}>
							<div
								className={`${styles.nav_button} ${styles.nav_link} ${styles.nav_link_schedule}`}
							>
								Schedule
							</div>
							<div className={styles.nav_schedule_dropdown}>
								<a
									className={styles.nav_schedule_item}
									href={`${MAIN_SITE_ORIGIN}/schedule/application`}
								>
									Application
								</a>
								<a
									className={styles.nav_schedule_item}
									href={`${MAIN_SITE_ORIGIN}/schedule/installer`}
								>
									Installer
								</a>
								<a
									className={styles.nav_schedule_item}
									href={`${MAIN_SITE_ORIGIN}/schedule/updates`}
								>
									Updates
								</a>
							</div>
						</div>
					)}

					<Link
						className={`${styles.nav_link} ${styles.nav_link_github}`}
						target='_blank'
						href='https://github.com/Devollox/void-presence'
						rel='noreferrer'
					>
						GitHub
						<span className={styles.nav_external_dot} />
						<svg
							aria-hidden='true'
							className={styles.navbar_external_arrow}
							height='7'
							viewBox='0 0 6 6'
							width='7'
						>
							<path
								d='M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z'
								fill='var(--accents-3)'
							></path>
						</svg>
					</Link>

					{!isApiHost && !isAuth && (
						<a className={styles.nav_cta_wrap} href={`${MAIN_SITE_ORIGIN}/signin`}>
							<button type='button' className={`${styles.btn} ${styles.btn_secondary}`}>
								<UserPen size={16} />
								<span>Sign in</span>
							</button>
						</a>
					)}

					{!isApiHost && isAuth && (
						<a className={styles.nav_cta_wrap} href={`${MAIN_SITE_ORIGIN}/profile`}>
							<button type='button' className={`${styles.btn} ${styles.btn_secondary}`}>
								<UserPen size={16} />
								<span>{session.user?.name ?? 'Profile'}</span>
							</button>
						</a>
					)}
				</nav>
			</div>
		</header>
	)
}
