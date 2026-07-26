import { PanelLayout } from '@components/panel-layout'
import layoutStyles from '@components/panel-layout/layout-panels.module.scss'
import ChangelogClient from '../download/changelog-client'
import styles from './release-schedule.module.scss'

export type CommonReleaseType = 'stable' | 'pre-release' | 'nightly' | 'end of life' | 'broken'

export interface CommonAsset {
	name: string
	size: number
	downloadUrl: string
}

export interface CommonRelease {
	version: string
	date: string
	notes: string
	assets: CommonAsset[]
	electronCurrent?: string | null
	wailsVersion?: string
	type: CommonReleaseType
	buildTag?: string
}

interface ReleasesSectionBaseProps {
	left: React.ReactNode
	releases: CommonRelease[]
	stableRelease: CommonRelease | null
	basePath: string
	title: string
	counterLabel: (count: number) => string
}

export function ReleasesSectionBase({
	left,
	releases,
	stableRelease,
	basePath,
	title,
	counterLabel,
}: ReleasesSectionBaseProps) {
	const stableVersion = stableRelease?.version ?? null

	return (
		<PanelLayout
			left={left}
			right={
				<section className={styles.page_section}>
					<div className={`${layoutStyles.preview_card_wrap} ${styles.preview_release_legend}`}>
						<div className={layoutStyles.preview_card}>
							<div className={styles.release_legend}>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_stable}`} />
									<span className={styles.release_legend_label}>
										Stable (Long-tested, latest recommended)
									</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_prerelease}`} />
									<span className={styles.release_legend_label}>Prerelease (Testing build)</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_nightly}`} />
									<span className={styles.release_legend_label}>
										Nightly (Fast builds, experimental)
									</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_broken}`} />
									<span className={styles.release_legend_label}>
										Broken (Known issues, debug only)
									</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_eol}`} />
									<span className={styles.release_legend_label}>
										End of Life (Legacy, lightly tested)
									</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_alpha}`} />
									<span className={styles.release_legend_label}>
										Alpha (Early testing, very unstable)
									</span>
								</div>
								<div className={styles.release_legend_item}>
									<span className={`${styles.dot} ${styles.dot_beta}`} />
									<span className={styles.release_legend_label}>
										Beta (Feature-complete, might be unstable)
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className={layoutStyles.preview_card_wrap}>
						<div className={layoutStyles.preview_card}>
							<div className={layoutStyles.preview_header}>
								<h3 className={styles.preview_title}>{title}</h3>
								<div className={layoutStyles.preview_badge}>
									<span className={layoutStyles.preview_badge_text}>
										{counterLabel(releases.length)}
									</span>
								</div>
							</div>

							<ul className={styles.release_list}>
								{releases.map(release => {
									const isCurrentStable = stableVersion && release.version === stableVersion

									const effectiveType = isCurrentStable ? 'stable' : release.type

									return (
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
											<a
												href={`${basePath}/${encodeURIComponent(release.version)}`}
												className={styles.release_card}
											>
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

													<span className={styles.release_card_date}>{release.date}</span>
												</div>

												<div className={styles.release_card_meta}>
													{(release.electronCurrent || release.wailsVersion) && (
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
																{release.electronCurrent && (
																	<>Electron v{release.electronCurrent}</>
																)}
																{release.electronCurrent && release.wailsVersion && ' · '}
																{release.wailsVersion && <>Wails v{release.wailsVersion}</>}
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
											</a>

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
									)
								})}
							</ul>
						</div>
					</div>
				</section>
			}
		/>
	)
}
