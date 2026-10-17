import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import styles from '../release-schedule.module.scss'
import ReleasesDownloadsChart from './releases-downloads-chart'

export interface DownloadsItem {
	tag: string
	totalDownloads: number
}

interface DownloadsContentBaseProps {
	items: DownloadsItem[]
	error: string | null
	scheduleHref: string
	downloadHref: string
	docsHref: string
	chartTitle: string
	scheduleLabel: string
	context: 'application' | 'installer' | 'updates'
}

export function DownloadsContentBase({
	items,
	error,
	scheduleHref,
	downloadHref,
	docsHref,
	chartTitle,
	scheduleLabel,
	context,
}: DownloadsContentBaseProps) {
	const chartData = items
		.map(r => ({
			tag: r.tag,
			totalDownloads: r.totalDownloads,
		}))
		.reverse()

	const totalDownloads = chartData.reduce((sum, item) => sum + item.totalDownloads, 0)

	const left = (
		<>
			{error ? (
				<InfoBox variant='muted' lines={[error]} />
			) : (
				<>
					<div className={styles.release_meta}>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Releases tracked</span>
							<span className={styles.release_value}>{items.length}</span>
						</div>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Total downloads</span>
							<span className={styles.release_value}>{totalDownloads.toLocaleString('en-US')}</span>
						</div>
					</div>

					{context === 'application' && (
						<>
							<InfoBox
								variant='secondary'
								title='Looking for a download?'
								lines={[
									'If you just need the latest stable build, you can always download it from the main download page.',
								]}
								linkHref={downloadHref}
								linkLabel='Go to download page'
							/>
							<InfoBox
								variant='secondary'
								title='Need help installing?'
								lines={[
									'Check the install guide on the main page for platform-specific setup and tips.',
								]}
								linkHref={docsHref}
								linkLabel='Read docs'
							/>
						</>
					)}

					{context === 'installer' && (
						<>
							<InfoBox
								variant='secondary'
								title='Looking for installer?'
								lines={[
									'Use the main download page to grab the recommended installer build for your platform.',
								]}
								linkHref={downloadHref}
								linkLabel='Open download page'
							/>
						</>
					)}

					{context === 'updates' && (
						<>
							<InfoBox
								variant='secondary'
								title='Looking for update history?'
								lines={[
									'Browse the full updates schedule to see all releases, including prereleases and nightly builds.',
								]}
								linkHref='/schedule/updates'
								linkLabel='Open updates schedule'
							/>
						</>
					)}

					<InfoBox
						variant='muted'
						lines={[
							'For full release history and detailed changelog per version, visit the release schedule page.',
						]}
						linkHref={scheduleHref}
						linkLabel={scheduleLabel}
					/>
				</>
			)}
		</>
	)

	const right = (
		<section className={styles.page_section}>
			<div style={{ marginBottom: '20px' }}>
				<InfoBox variant='secondary' linkHref={scheduleHref} linkLabel='Back to Schedule' />
			</div>
			<div className={layoutStyles.preview_card_wrap}>
				<ReleasesDownloadsChart data={chartData} title={chartTitle} />
			</div>
		</section>
	)

	return <PanelLayout left={left} right={right} />
}
