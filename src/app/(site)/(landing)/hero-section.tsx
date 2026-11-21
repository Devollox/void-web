'use client'

import RenderBackdropAnimation from '@/lib/render-backdrop'
import Button from '@components/button'
import Stats from '@components/stats'
import styles from './hero-section.module.scss'

export function NotificationBanner() {
	return (
		<div className={styles.notification_banner}>
			<div className={styles.notification_glow} />
			<div className={styles.notification_dot} />
			<div className={styles.notification_content}>
				<span className={styles.notification_title}>
					On the way to <strong>1,000</strong> downloads.
				</span>
				<span className={styles.notification_subtitle}>
					Thank you for being here. To mark this milestone, I’m working on a fresh look for the app,
					website, installer, and updater.
					<br />
					With a lot on my plate right now, the redesign may arrive a little after we reach 1,000.
					I’m taking the time to get the details right.
					<br />
					<a
						href='/post/new-redesign.png'
						className={styles.notification_link}
						target='_blank'
						rel='noopener noreferrer'
					>
						Take a look at the preview
					</a>
					.
				</span>
			</div>
		</div>
	)
}

export default function HeroSection() {
	return (
		<section id='home-hero-section' className={styles.page_section}>
			<RenderBackdropAnimation />
			<div className={styles.page_section_inner}>
				<div id='hero-top-container' className={styles.flex_container}>
					<NotificationBanner />

					<div className={styles.title_wrapper}>
						<h1 className={styles.title}>
							<span className={styles.title_gradient}>Void</span>
							<span className={styles.title_white}>Presence</span>
						</h1>
						<div className={styles.title_glow} aria-hidden='true' />
					</div>
					<p className={`${styles.text_center} ${styles.title_description}`}>
						Advanced Discord Rich Presence manager with customizable profiles.
					</p>

					<Button />
					<Stats />
					<div className={styles.mouse_icon}>
						<div className={styles.scroll_wheel}></div>
					</div>
				</div>
			</div>
		</section>
	)
}
