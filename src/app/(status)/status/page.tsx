import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import { UptimeChart } from '@components/uptime/uptime-chart'
import type { Metadata } from 'next'
import styles from './status.module.scss'

export const metadata: Metadata = {
	title: 'Status',
	description:
		"Current Void Presence status and details about Discord's Rich Presence buttons visibility bug.",
	openGraph: {
		title: 'Void Presence - Status',
		description:
			"Check current Void Presence status and learn about Discord's Rich Presence buttons visibility issue.",
		url: '/status',
	},
	alternates: {
		canonical: '/status',
	},
}

export default function StatusPage() {
	const left = (
		<>
			<InfoBox
				title='Current status'
				lines={[
					'Void Presence is operating normally.',
					'Rich Presence updates are sent to Discord on schedule.',
					'The only limitation right now is a Discord-side bug with button visibility in your own client.',
				]}
			/>
			<InfoBox
				variant='secondary'
				title='What you will see'
				lines={[
					'In your own Discord client, Rich Presence buttons may be hidden or look inconsistent.',
					'Friends and other users still see and can click the buttons as expected, using your configured labels and URLs.',
				]}
			/>
			<InfoBox
				variant='muted'
				lines={[
					'If Discord changes this behavior in the future, Void Presence will continue working without additional steps from you.',
				]}
				linkHref='/docs'
				linkLabel='Read setup & troubleshooting'
			/>
		</>
	)

	const right = (
		<section className={styles.page_section}>
			<div className={layoutStyles.preview_card_wrap}>
				<div className={layoutStyles.preview_card}>
					<div className={layoutStyles.preview_header}>
						<h3 className={layoutStyles.preview_title}>Service status</h3>
					</div>
					<UptimeChart />
				</div>
			</div>
			<div className={layoutStyles.preview_card_wrap}>
				<div className={layoutStyles.preview_card}>
					<div className={layoutStyles.preview_header}>
						<h3 className={layoutStyles.preview_title}>Server configuration</h3>
					</div>
					<div className={layoutStyles.secondary_box}>
						<p className={layoutStyles.secondary_title}>CPU</p>
						<p className={layoutStyles.secondary_text}>1× 2.2 GHz</p>
					</div>
					<div className={layoutStyles.secondary_box}>
						<p className={layoutStyles.secondary_title}>RAM</p>
						<p className={layoutStyles.secondary_text}>0.5 GB</p>
					</div>
					<div className={layoutStyles.secondary_box}>
						<p className={layoutStyles.secondary_title}>Storage</p>
						<p className={layoutStyles.secondary_text}>10 GB HDD RAID</p>
					</div>
					<div className={layoutStyles.secondary_box}>
						<p className={layoutStyles.secondary_title}>Network</p>
						<p className={layoutStyles.secondary_text}>1 dedicated IP · Moscow</p>
					</div>
				</div>
			</div>
		</section>
	)

	return (
		<Page isApiHost={true}>
			<PageHeader
				title='Void Presence Status'
				subtitle='Void Presence is working normally; Discord may hide your own buttons, but others still see them.'
			/>
			<PanelLayout left={left} right={right} className={styles.status_panel} />
			<Footer />
		</Page>
	)
}
