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
					Total downloads exceeded <strong>600</strong>!
				</span>
				<span className={styles.notification_subtitle}>
					Thank you for your support! We appreciate every one of you. Wishing you an amazing
					experience with Void Presence! <br /> Check out our new{' '}
					<a href='/schedule/application/downloads' className={styles.notification_link}>
						downloads schedule
					</a>
					!
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
