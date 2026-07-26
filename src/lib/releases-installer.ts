import { githubHeaders } from '@/lib/github-headers'
import {
	applyBuildTagPriority,
	compareVersionsDesc,
	fetchAllReleases,
	formatDate,
	getSortDate,
	mapReleaseAssets,
	ReleaseAsset,
	ReleaseDownloadsItem,
	ReleaseType,
} from '@/lib/github-releases-common'
import { normalizeReleaseNotes } from '@/lib/release-notes'
import { classifyRelease } from '@/lib/release-tags'
import { getWailsMetadata } from './parse-version'

export interface ReleaseInfo {
	version: string
	commit: string | null
	date: string
	publishedAt: string
	notes: string
	assets: ReleaseAsset[]
	prerelease: boolean
	draft: boolean
	url: string
	type: ReleaseType
	buildTag?: string
	wailsVersion?: string
	goVersion?: string
}

function getSortDateLocal(release: ReleaseInfo): Date {
	return getSortDate({ publishedAt: release.publishedAt, date: release.date })
}

export async function getInstallerReleases(): Promise<{
	releases: ReleaseInfo[]
	githubLatestRelease: ReleaseInfo | null
	error: string | null
}> {
	try {
		const [listRes, latestRes] = await Promise.all([
			fetchAllReleases('void-installer'),
			fetch('https://api.github.com/repos/Devollox/void-installer/releases/latest', {
				cache: 'force-cache',
				next: { revalidate: 300 },
				headers: githubHeaders(),
			}),
		])

		if (listRes.error !== null || !listRes.data) {
			return {
				releases: [],
				githubLatestRelease: null,
				error:
					listRes.error === 403
						? 'GitHub API rate limit exceeded. Please try again in a few minutes or open the GitHub releases page.'
						: 'Failed to load installer release schedule. Please try again later.',
			}
		}

		const data = listRes.data
		const rawReleases = Array.isArray(data) ? data : []

		let releases: ReleaseInfo[] = await Promise.all(
			rawReleases
				.filter((item: any) => item && !item.draft)
				.map(async (item: any) => {
					const rawAssets = Array.isArray(item.assets) ? item.assets : []

					const assets: ReleaseAsset[] = mapReleaseAssets(rawAssets)

					const rawBody = item.body || ''
					const notes = normalizeReleaseNotes(rawBody)
					const classification = classifyRelease(item, rawBody)

					const tag = item.tag_name || 'unknown'
					const wailsMeta =
						tag && tag !== 'unknown' ? await getWailsMetadata(tag, 'installer') : null

					return {
						version: tag,
						commit: item.target_commitish || null,
						date: item.published_at ? formatDate(item.published_at) : 'Unknown',
						publishedAt: item.published_at ?? '',
						notes,
						assets,
						prerelease: !!item.prerelease,
						draft: !!item.draft,
						url: item.html_url || '',
						type: classification.type,
						buildTag: classification.buildTag,
						wailsVersion: wailsMeta?.wails,
						goVersion: wailsMeta?.go,
					}
				})
		)

		releases = applyBuildTagPriority(releases)

		const stableTagVersions = new Set(
			releases.filter(r => r.buildTag?.toLowerCase() === 'stable').map(r => r.version)
		)

		releases = releases.map(r => {
			if (r.type === 'nightly' || r.type === 'pre-release' || r.type === 'broken') {
				return r
			}

			if (stableTagVersions.has(r.version)) {
				return { ...r, type: 'stable' as const }
			}

			return { ...r, type: 'end of life' as const }
		})

		releases = releases.sort((a, b) => {
			const dateDiff = getSortDateLocal(b).getTime() - getSortDateLocal(a).getTime()
			if (dateDiff !== 0) return dateDiff
			return compareVersionsDesc(a.version, b.version)
		})

		let githubLatestRelease: ReleaseInfo | null = null

		if (latestRes.ok) {
			const latestData = await latestRes.json()
			const rawAssets = Array.isArray(latestData.assets) ? latestData.assets : []

			const assets: ReleaseAsset[] = mapReleaseAssets(rawAssets)

			const rawBody = latestData.body || ''
			const notes = normalizeReleaseNotes(rawBody)
			const classification = classifyRelease(latestData, rawBody)

			githubLatestRelease = {
				version: latestData.tag_name || 'unknown',
				commit: latestData.target_commitish || null,
				date: latestData.published_at ? formatDate(latestData.published_at) : 'Unknown',
				publishedAt: latestData.published_at ?? '',
				notes,
				assets,
				prerelease: !!latestData.prerelease,
				draft: !!latestData.draft,
				url: latestData.html_url || '',
				type: classification.type,
				buildTag: classification.buildTag,
			}
		}

		return { releases, githubLatestRelease, error: null }
	} catch {
		return {
			releases: [],
			githubLatestRelease: null,
			error: 'Failed to load installer release schedule. Please try again later.',
		}
	}
}

export interface ReleaseDownloadsResult {
	items: ReleaseDownloadsItem[]
	error: string | null
}

export async function getInstallerReleaseDownloads(): Promise<ReleaseDownloadsResult> {
	const res = await fetchAllReleases('void-installer')

	if (res.error !== null || !res.data) {
		return {
			items: [],
			error:
				res.error === 403
					? 'GitHub API rate limit exceeded. Please try again in a few minutes or open the GitHub releases page.'
					: 'Failed to load installer release schedule. Please try again later.',
		}
	}

	const data = res.data
	const rawReleases = Array.isArray(data) ? data : []

	const items: ReleaseDownloadsItem[] = rawReleases
		.filter((item: any) => item && !item.draft)
		.map((item: any) => {
			const tag = item.tag_name as string
			const name = (item.name as string) ?? null
			const assets = Array.isArray(item.assets) ? item.assets : []

			const totalDownloads = assets.reduce(
				(sum: number, asset: any) =>
					sum + (typeof asset.download_count === 'number' ? asset.download_count : 0),
				0
			)

			return {
				tag,
				name,
				totalDownloads,
			}
		})
		.sort((a, b) => {
			const aTag = a.tag
			const bTag = b.tag
			return bTag.localeCompare(aTag, undefined, {
				numeric: true,
				sensitivity: 'base',
			})
		})

	return { items, error: null }
}
