import { extractPackageMeta, getInstallerPackageJsonByTag } from '@/lib/package-meta'
import { getWailsMetadata } from '@/lib/parse-version'
import { getInstallerReleases } from '@/lib/releases-installer'
import { InfoBox } from '@components/status-info/info-box'
import type { Metadata } from 'next'
import DownloadButtons from '../../download/download-buttons'
import styles from '../release-schedule.module.scss'
import { ReleasesSectionBase } from '../releases-section-base'

export const metadata: Metadata = {
	title: 'Release Installer',
	description:
		'Release history for the Void Presence installer with version timeline and GitHub release data.',
	openGraph: {
		title: 'Void Presence - Installer Releases',
		description: 'Track Void Presence installer releases and changelog history in one place.',
		url: '/schedule/installer',
	},
}

export async function ReleasesSection() {
	const { releases, githubLatestRelease, error } = await getInstallerReleases()

	const stableRelease = githubLatestRelease ?? releases[0] ?? null

	const pkg =
		stableRelease && stableRelease.version
			? await getInstallerPackageJsonByTag(stableRelease.version)
			: null

	const pkgMeta = pkg ? extractPackageMeta(pkg) : null

	const wailsMeta =
		stableRelease && stableRelease.version
			? await getWailsMetadata(stableRelease.version, 'installer')
			: null

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
						{wailsMeta?.wails && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Wails</span>
								<span className={styles.release_value}>v{wailsMeta.wails}</span>
							</div>
						)}
						{wailsMeta?.go && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Go</span>
								<span className={styles.release_value}>v{wailsMeta.go}</span>
							</div>
						)}
						<div className={styles.release_row}>
							<span className={styles.release_label}>React</span>
							<span className={styles.release_value}>
								{(() => {
									const raw = pkgMeta?.dependencies.find(dep => dep.key === 'react')?.value
									if (!raw) return 'unknown'
									const cleaned = raw.replace(/^[~^]/, '')
									return `v${cleaned}`
								})()}
							</span>
						</div>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Vite</span>
							<span className={styles.release_value}>
								{(() => {
									const raw = pkgMeta?.dependencies.find(dep => dep.key === 'vite')?.value
									if (!raw) return 'unknown'
									const cleaned = raw.replace(/^[~^]/, '')
									return `v${cleaned}`
								})()}
							</span>
						</div>
					</div>
				</>
			) : (
				<InfoBox lines={['No stable installer release available.']} />
			)}

			<InfoBox
				variant='secondary'
				title='Installer info'
				lines={[
					'Latest GitHub installer release appears at the top.',
					'Prereleases and testing builds are ordered by release date.',
				]}
				linkHref='/schedule/installer/downloads'
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
			basePath='/schedule/installer'
			title='Release list'
			counterLabel={count => `${count} total release`}
			legendVariant='installer'
		/>
	)
}
