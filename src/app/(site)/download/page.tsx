import { getElectronMetadata } from '@/lib/parse-version'
import { getLatestRelease } from '@/lib/releases-application'
import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import config from '@data/config.json'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ChangelogClient from './changelog-client'
import DownloadButtons from './download-buttons'
import DownloadSkeleton from './download-skeleton'
import styles from './download.module.scss'
import RpcPreviewClient from './rpc-preview-client'

export const metadata: Metadata = {
	title: 'Download',
	description:
		'Download Void Presence for Windows and keep your Discord Rich Presence always in sync.',
	openGraph: {
		title: 'Void Presence - Download',
		description:
			'Get the latest Void Presence build and customize your Discord Rich Presence with profiles, buttons, and cycles.',
		url: '/download',
	},
	alternates: {
		canonical: '/download',
	},
}

async function DownloadContent() {
	const { release, error } = await getLatestRelease()

	const metadata = await getElectronMetadata(`${release?.electronCurrent}`)

	const chromiumMain = metadata?.chromium
	const nodeJsMain = metadata?.node
	const v8Main = metadata?.v8

	const left = (
		<>
			{error ? (
				<InfoBox variant='muted' lines={[error]} />
			) : release ? (
				<>
					<DownloadButtons assets={release.assets} />

					<div className={styles.release_meta}>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Version</span>
							<span className={styles.release_value}>{release.version}</span>
						</div>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Release date</span>
							<span className={styles.release_value}>{release.date}</span>
						</div>
						{release.electronCurrent && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Electron</span>
								<span className={styles.release_value}>v{release.electronCurrent}</span>
							</div>
						)}
						{chromiumMain && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Chromium</span>
								<span className={styles.release_value}>v{chromiumMain}</span>
							</div>
						)}
						{nodeJsMain && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Node.js</span>
								<span className={styles.release_value}>v{nodeJsMain}</span>
							</div>
						)}
						{v8Main && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>V8</span>
								<span className={styles.release_value}>v{v8Main}</span>
							</div>
						)}
					</div>
				</>
			) : (
				<InfoBox lines={['No release info available.']} />
			)}

			<InfoBox
				variant='secondary'
				title='Need help installing?'
				lines={['Check the install guide on the main page for platform-specific setup and tips.']}
				linkHref='/docs'
				linkLabel='Read docs'
			/>

			<InfoBox
				variant='muted'
				lines={[
					'If your Rich Presence buttons are not visible in Discord, see the status page for details.',
				]}
				linkHref='/status'
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
						{release && (
							<div className={layoutStyles.preview_badge}>
								<span className={layoutStyles.preview_badge_text}>{release.version}</span>
							</div>
						)}
					</div>

					<div className={styles.rpc_card_preview}>
						<RpcPreviewClient config={config} />
					</div>

					{release && release.notes && <ChangelogClient release={release} />}
				</div>
			</div>
		</section>
	)

	return <PanelLayout left={left} right={right} />
}

export default function DownloadPage() {
	return (
		<Page>
			<PageHeader
				title='Download Void Presence'
				subtitle='Get the desktop client and keep your Discord Rich Presence always in sync.'
			/>
			<Suspense fallback={<DownloadSkeleton />}>
				<DownloadContent />
			</Suspense>
			<Footer />
		</Page>
	)
}
