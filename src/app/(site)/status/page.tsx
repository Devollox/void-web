import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import config from '@data/config.json'
import type { Metadata } from 'next'
import RpcPreviewClient from '../download/rpc-preview-client'
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
						<h3 className={layoutStyles.preview_title}>Live presence preview</h3>
					</div>

					<div className={styles.rpc_card_preview}>
						<RpcPreviewClient config={config} />
					</div>

					<div className={styles.preview_footer}>
						<p className={styles.preview_note}>
							This preview shows how your activity looks to others. Button visibility in your own
							client may differ because of the current Discord bug.
						</p>
					</div>
				</div>
			</div>
		</section>
	)

	return (
		<Page>
			<PageHeader
				title='Status'
				subtitle='Void Presence is working normally; Discord may hide your own buttons, but others still see them.'
			/>
			<PanelLayout left={left} right={right} className={styles.status_panel} />
			<Footer />
		</Page>
	)
}
