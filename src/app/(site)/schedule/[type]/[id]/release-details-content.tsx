import ChangelogClient from '@/app/(site)/download/changelog-client'
import DownloadButtons from '@/app/(site)/download/download-buttons'
import {
	extractPackageMeta,
	getApplicationPackageJsonByTag,
	getInstallerPackageJsonByTag,
	getUpdatesPackageJsonByTag,
} from '@/lib/package-meta'
import { getElectronMetadata, parseElectronVersionFromNotes } from '@/lib/parse-version'
import { normalizeReleaseNotes } from '@/lib/release-notes'
import { getReleases, type ReleaseInfo as AppReleaseInfo } from '@/lib/releases-application'
import {
	getInstallerReleases,
	type ReleaseInfo as InstallerReleaseInfo,
} from '@/lib/releases-installer'
import { getUpdatesReleases, type ReleaseInfo as UpdatesReleaseInfo } from '@/lib/releases-updates'
import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import { InfoBox } from '@components/status-info/info-box'
import styles from '../../release-schedule.module.scss'

type ReleaseType = 'application' | 'installer' | 'updates'

type CommonReleaseInfo = AppReleaseInfo | InstallerReleaseInfo | UpdatesReleaseInfo

interface ReleaseDetailsContentProps {
	type: ReleaseType
	id: string
}

export async function ReleaseDetailsContent({ type, id }: ReleaseDetailsContentProps) {
	const isApplication = type === 'application'
	const isInstaller = type === 'installer'
	const isUpdates = type === 'updates'

	const [releaseData, pkg] = await Promise.all([
		isApplication ? getReleases() : isInstaller ? getInstallerReleases() : getUpdatesReleases(),
		isApplication
			? getApplicationPackageJsonByTag(id)
			: isInstaller
				? getInstallerPackageJsonByTag(id)
				: isUpdates
					? getUpdatesPackageJsonByTag(id)
					: null,
	])

	const { releases, githubLatestRelease, error } = releaseData

	const stableRelease = githubLatestRelease ?? releases[0] ?? null

	const matched =
		releases.find((r: CommonReleaseInfo) => r.version === id) ??
		releases.find((r: CommonReleaseInfo) => r.version === `v${id}`) ??
		null

	const release: CommonReleaseInfo | null = matched ?? stableRelease

	const isCurrentStable = !!stableRelease && !!release && stableRelease.version === release.version

	const effectiveType = release && (isCurrentStable ? ('stable' as const) : release.type)

	const pkgMeta = pkg ? extractPackageMeta(pkg) : null

	const electronFromPkg =
		isApplication && pkg ? (pkg.dependencies?.electron ?? pkg.devDependencies?.electron) : undefined

	const notes = release?.notes ? normalizeReleaseNotes(release.notes) : ''

	const electronVersion = isApplication && notes ? parseElectronVersionFromNotes(notes) : undefined

	const electronMain =
		isApplication && release
			? ((release as AppReleaseInfo).electronCurrent ??
				electronVersion ??
				(electronFromPkg ? String(electronFromPkg) : undefined))
			: undefined

	const electronMeta =
		isApplication && electronMain ? await getElectronMetadata(`${electronMain}`) : null

	const chromiumMain = electronMeta?.chromium
	const nodeJsMain = electronMeta?.node
	const v8Main = electronMeta?.v8

	const installerWails = isInstaller && (release as InstallerReleaseInfo)?.wailsVersion
	const installerGo = isInstaller && (release as InstallerReleaseInfo)?.goVersion

	const updatesWails = isUpdates && (release as UpdatesReleaseInfo)?.wailsVersion
	const updatesGo = isUpdates && (release as UpdatesReleaseInfo)?.goVersion

	const left = (
		<>
			{error ? (
				<InfoBox variant='muted' lines={[error]} />
			) : release ? (
				<>
					{release.assets.length > 0 && <DownloadButtons assets={release.assets} />}

					<div className={styles.release_meta}>
						<div className={styles.release_row}>
							<span className={styles.release_label}>Version</span>
							<span className={styles.release_value}>{release.version}</span>
						</div>
						{release.date && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Release date</span>
								<span className={styles.release_value}>{release.date}</span>
							</div>
						)}

						{(installerGo || isUpdates) && (
							<>
								{(installerGo || isUpdates) && (
									<div className={styles.release_row}>
										<span className={styles.release_label}>Wails</span>
										<span className={styles.release_value}>
											v{installerWails}
											{updatesWails}
										</span>
									</div>
								)}
								{(installerGo || isUpdates) && (
									<div className={styles.release_row}>
										<span className={styles.release_label}>Go</span>
										<span className={styles.release_value}>
											v{installerGo}
											{updatesGo}
										</span>
									</div>
								)}
								{pkgMeta && (
									<div className={styles.release_row}>
										<span className={styles.release_label}>React</span>
										<span className={styles.release_value}>
											{(() => {
												const raw = pkgMeta.dependencies.find(dep => dep.key === 'react')?.value
												if (!raw) return 'unknown'
												const cleaned = raw.replace(/^[~^]/, '')
												return `v${cleaned}`
											})()}
										</span>
									</div>
								)}
								{pkgMeta && (
									<div className={styles.release_row}>
										<span className={styles.release_label}>Vite</span>
										<span className={styles.release_value}>
											{(() => {
												const raw = pkgMeta.dependencies.find(dep => dep.key === 'vite')?.value
												if (!raw) return 'unknown'
												const cleaned = raw.replace(/^[~^]/, '')
												return `v${cleaned}`
											})()}
										</span>
									</div>
								)}
							</>
						)}

						{isApplication && electronMain && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Electron</span>
								<span className={styles.release_value}>v{electronMain}</span>
							</div>
						)}
						{isApplication && chromiumMain && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Chromium</span>
								<span className={styles.release_value}>v{chromiumMain}</span>
							</div>
						)}
						{isApplication && nodeJsMain && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>Node.js</span>
								<span className={styles.release_value}>v{nodeJsMain}</span>
							</div>
						)}
						{isApplication && v8Main && (
							<div className={styles.release_row}>
								<span className={styles.release_label}>V8</span>
								<span className={styles.release_value}>v{v8Main}</span>
							</div>
						)}
					</div>

					<InfoBox
						variant='secondary'
						title={
							isApplication ? 'Want the latest application version?' : 'Want the latest installer?'
						}
						lines={[
							isApplication
								? 'If you just need the latest stable application build, you can always download it from the main download page.'
								: 'If you just need the latest recommended installer, you can download it from the main download page.',
						]}
						linkHref='/download'
						linkLabel='Go to download page'
					/>

					{release.url && (
						<InfoBox
							variant='secondary'
							lines={['View this release on GitHub for full changelog and assets.']}
							linkHref={release.url}
							linkLabel='Check GitHub'
						/>
					)}
				</>
			) : (
				<InfoBox
					variant='muted'
					lines={[
						'This release could not be loaded from GitHub.',
						'It may have been removed or is temporarily unavailable.',
					]}
				/>
			)}

			{!pkg && isApplication && (
				<InfoBox
					variant='muted'
					lines={[
						'Could not load package.json for this tag.',
						'It may not exist for older releases or this tag may not be available on GitHub.',
					]}
				/>
			)}
		</>
	)

	const right = (
		<section className={styles.page_section}>
			<div className={styles.wrapper_info_section} style={{ marginBottom: '20px' }}>
				<InfoBox variant='secondary' linkHref={`/schedule/${type}`} linkLabel='Back to Schedule' />
			</div>
			<div className={layoutStyles.preview_card_wrap}>
				<div className={layoutStyles.preview_card}>
					<div className={layoutStyles.preview_header}>
						<h3 className={styles.preview_title}>Release details</h3>
						<div className={layoutStyles.preview_badge}>
							<span className={styles.preview_badge_text}>{release && release.version}</span>
						</div>
					</div>

					{release && (
						<ul className={styles.release_list}>
							<li
								key={release.version}
								className={`${styles.release_item} ${
									release.buildTag === 'alpha'
										? styles.bg_release_alpha
										: release.buildTag === 'beta'
											? styles.bg_release_beta
											: effectiveType === 'stable'
												? styles.bg_release_stable
												: effectiveType === 'nightly'
													? styles.bg_release_nightly
													: effectiveType === 'pre-release'
														? styles.bg_release_prerelease
														: effectiveType === 'broken'
															? styles.bg_release_broken
															: styles.bg_release_eol
								}`}
							>
								<div className={styles.release_card}>
									<div className={styles.release_card_top}>
										<div className={styles.release_card_left}>
											<div className={styles.version_row}>
												<span className={styles.release_card_version}>{release.version}</span>
												<span className={styles.release_card_badge}>
													{release.buildTag === 'alpha'
														? 'Alpha'
														: release.buildTag === 'beta'
															? 'Beta'
															: effectiveType === 'stable'
																? 'Stable'
																: effectiveType === 'nightly'
																	? 'Nightly'
																	: effectiveType === 'pre-release'
																		? 'Prerelease'
																		: effectiveType === 'broken'
																			? 'Broken'
																			: 'End of Life'}
												</span>
											</div>
										</div>

										{release.date && (
											<span className={styles.release_card_date}>{release.date}</span>
										)}
									</div>

									<div className={styles.release_card_meta}>
										{isApplication && (electronMain || pkgMeta) && (
											<div className={styles.electron_row}>
												<div className={styles.dot_wrap}>
													<div
														className={`
                              ${styles.dot}
                              ${
																release.buildTag === 'alpha'
																	? styles.dot_alpha
																	: release.buildTag === 'beta'
																		? styles.dot_beta
																		: release.buildTag === 'broken'
																			? styles.dot_broken
																			: effectiveType === 'stable'
																				? styles.dot_stable
																				: effectiveType === 'nightly'
																					? styles.dot_nightly
																					: effectiveType === 'pre-release'
																						? styles.dot_prerelease
																						: styles.dot_eol
															}
                            `}
													/>
												</div>

												<span className={styles.electron_versions}>
													Electron v
													{electronMain ??
														pkgMeta?.dependencies.find(dep => dep.key === 'electron')?.value ??
														'unknown'}
												</span>
											</div>
										)}

										{isInstaller &&
											((installerWails as string | undefined) ||
												(installerGo as string | undefined)) && (
												<div className={styles.electron_row}>
													<div className={styles.dot_wrap}>
														<div
															className={`
                                ${styles.dot}
                                ${
																	release.buildTag === 'alpha'
																		? styles.dot_alpha
																		: release.buildTag === 'beta'
																			? styles.dot_beta
																			: release.buildTag === 'broken'
																				? styles.dot_broken
																				: effectiveType === 'stable'
																					? styles.dot_stable
																					: effectiveType === 'nightly'
																						? styles.dot_nightly
																						: effectiveType === 'pre-release'
																							? styles.dot_prerelease
																							: styles.dot_eol
																}
                              `}
														/>
													</div>
													<span className={styles.electron_versions}>
														{installerWails && <>Wails v{installerWails}</>}
													</span>
												</div>
											)}

										<span className={styles.release_card_meta_item}>
											{release.assets.length} assets
										</span>
										<span className={styles.release_card_meta_item}>
											{release.notes ? 'Has changelog' : 'No changelog'}
										</span>
									</div>
								</div>

								{release.notes && (
									<div className={styles.release_card_changelog}>
										<ChangelogClient
											release={{
												version: release.version,
												date: release.date,
												notes: release.notes,
												assets: release.assets,
											}}
										/>
									</div>
								)}
							</li>
						</ul>
					)}

					{pkgMeta && (
						<div className={styles.package_snapshot_wrap}>
							<div className={styles.package_snapshot_grid}>
								{pkgMeta.dependencies.map(dep => (
									<div key={dep.key} className={styles.package_snapshot_row}>
										<span className={styles.package_snapshot_label}>{dep.label}</span>
										<div className={styles.package_snapshot_value}>
											<span className={styles.package_snapshot_version}>{dep.value}</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	)

	return <PanelLayout left={left} right={right} />
}
