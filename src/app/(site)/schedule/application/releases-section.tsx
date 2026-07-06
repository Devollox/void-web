import { getElectronMetadata } from '@/lib/parse-version'
import { getReleases } from '@/lib/releases-application'
import { InfoBox } from '@components/status-info/info-box'
import type { Metadata } from 'next'
import DownloadButtons from '../../download/download-buttons'
import styles from '../release-schedule.module.scss'
import { ReleasesSectionBase } from '../releases-section-base'

export const metadata: Metadata = {
	title: 'Release Application',
	description:
		'Release Application and history for Void Presence with version timeline and GitHub release data.',
	openGraph: {
		title: 'Void Presence - Application Release',
		description: 'Track Void Presence releases, prereleases, and changelog history in one place.',
		url: '/schedule/application',
	},
}

export async function ReleasesSection() {
	const { releases, githubLatestRelease, error } = await getReleases()

	const stableRelease = githubLatestRelease ?? releases[0] ?? null
	const scheduleElectronSource =
		releases.find(r => r.version === stableRelease?.version) ?? stableRelease

	const metadata = scheduleElectronSource?.electronCurrent
		? await getElectronMetadata(`${scheduleElectronSource.electronCurrent}`)
		: null

	const chromiumMain = metadata?.chromium
	const nodeJsMain = metadata?.node
	const v8Main = metadata?.v8

	const left = (
		<>
			{error ? (
				<InfoBox variant='muted' lines={[error]} />
			) : stableRelease ? (
				<>
					{stableRelease.assets.length > 0 && <DownloadButtons assets={stableRelease.assets} />}

					<div className={styles.release_meta}>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Version</span>
							<span className={styles.release_value}>{stableRelease.version}</span>
						</div>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Release date</span>
							<span className={styles.release_value}>{stableRelease.date}</span>
						</div>
						{scheduleElectronSource?.electronCurrent && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Electron</span>
								<span className={styles.release_value}>
									v{scheduleElectronSource.electronCurrent}
								</span>
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
				<InfoBox lines={['No stable release available.']} />
			)}

			<InfoBox
				variant='secondary'
				title='Application info'
				lines={[
					'Latest GitHub release appears at the top.',
					'Prereleases and nightly builds are ordered by release date.',
				]}
				linkHref='/schedule/application/downloads'
				linkLabel='View downloads analytics'
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

	return (
		<ReleasesSectionBase
			left={left}
			releases={releases}
			stableRelease={stableRelease}
			basePath='/schedule/application'
			title='Release list'
			counterLabel={count => `${count} total release`}
			legendVariant='application'
		/>
	)
}
