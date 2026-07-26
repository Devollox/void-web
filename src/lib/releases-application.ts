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
import {
	parseChromiumVersionFromNotes,
	parseElectronVersionFromNotes,
	parseNodeJsVersionFromNotes,
	parseV8VersionFromNotes,
} from '@/lib/parse-version'
import { normalizeReleaseNotes } from '@/lib/release-notes'
import { classifyRelease } from '@/lib/release-tags'
import { extractPackageMeta, PackageJson } from './package-meta'

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
	electronCurrent?: string
	chromiumCurrent?: string
	nodeJsCurrent?: string
	v8Current?: string
	buildTag?: string
}

export async function getReleases(): Promise<{
	releases: ReleaseInfo[]
	githubLatestRelease: ReleaseInfo | null
	error: string | null
}> {
	try {
		const [listRes, latestRes] = await Promise.all([
			fetchAllReleases('void-presence'),
			fetch('https://api.github.com/repos/Devollox/void-presence/releases/latest', {
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
						: 'Failed to load release schedule. Please try again later.',
			}
		}

		const rawReleases = listRes.data

		let releases: ReleaseInfo[] = rawReleases
			.filter((item: any) => item && !item.draft)
			.map((item: any) => {
				const rawAssets = Array.isArray(item.assets) ? item.assets : []

				const assets: ReleaseAsset[] = mapReleaseAssets(rawAssets)

				const rawBody = item.body || ''
				const notes = normalizeReleaseNotes(rawBody)
				const electronVersion = parseElectronVersionFromNotes(notes)
				const chromiumVersion = parseChromiumVersionFromNotes(notes)
				const nodeJsVersion = parseNodeJsVersionFromNotes(notes)
				const v8Version = parseV8VersionFromNotes(notes)
				const classification = classifyRelease(item, rawBody)

				return {
					version: item.tag_name || 'unknown',
					commit: item.target_commitish || null,
					date: item.published_at ? formatDate(item.published_at) : 'Unknown',
					publishedAt: item.published_at ?? '',
					notes,
					assets,
					prerelease: !!item.prerelease,
					draft: !!item.draft,
					url: item.html_url || '',
					type: classification.type,
					electronCurrent: electronVersion,
					chromiumCurrent: chromiumVersion,
					nodeJsCurrent: nodeJsVersion,
					v8Current: v8Version,
					buildTag: classification.buildTag,
				}
			})

		releases = releases.sort((a, b) => {
			return getSortDate(a).getTime() - getSortDate(b).getTime()
		})

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

		let lastElectronVersion: string | undefined
		let lastChromiumVersion: string | undefined
		let lastNodeJsVersion: string | undefined
		let lastV8Version: string | undefined

		releases = releases
			.sort((a, b) => {
				return getSortDate(a).getTime() - getSortDate(b).getTime()
			})
			.map(release => {
				if (release.electronCurrent) {
					lastElectronVersion = release.electronCurrent
				}
				if (release.chromiumCurrent) {
					lastChromiumVersion = release.chromiumCurrent
				}
				if (release.nodeJsCurrent) {
					lastNodeJsVersion = release.nodeJsCurrent
				}
				if (release.v8Current) {
					lastV8Version = release.v8Current
				}

				return {
					...release,
					electronCurrent: release.electronCurrent || lastElectronVersion,
					chromiumCurrent: release.chromiumCurrent || lastChromiumVersion,
					nodeJsCurrent: release.nodeJsCurrent || lastNodeJsVersion,
					v8Current: release.v8Current || lastV8Version,
				}
			})
			.sort((a, b) => {
				const dateDiff = getSortDate(b).getTime() - getSortDate(a).getTime()
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
			const electronVersion = parseElectronVersionFromNotes(notes)
			const chromiumVersion = parseChromiumVersionFromNotes(notes)
			const nodeJsVersion = parseNodeJsVersionFromNotes(notes)
			const v8Version = parseV8VersionFromNotes(notes)
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
				electronCurrent: electronVersion,
				chromiumCurrent: chromiumVersion,
				nodeJsCurrent: nodeJsVersion,
				v8Current: v8Version,
				buildTag: classification.buildTag,
			}
		}

		return { releases, githubLatestRelease, error: null }
	} catch {
		return {
			releases: [],
			githubLatestRelease: null,
			error: 'Failed to load release schedule. Please try again later.',
		}
	}
}

export interface ReleaseDownloadsResult {
	items: ReleaseDownloadsItem[]
	error: string | null
}

export async function getReleaseDownloads(): Promise<ReleaseDownloadsResult> {
	const res = await fetchAllReleases('void-presence')

	if (res.error !== null || !res.data) {
		return {
			items: [],
			error:
				res.error === 403
					? 'GitHub API rate limit exceeded. Please try again in a few minutes or open the GitHub releases page.'
					: 'Failed to load release schedule. Please try again later.',
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

export async function getPackageJsonByTag(tag: string): Promise<PackageJson | null> {
	const url = `https://raw.githubusercontent.com/Devollox/void-presence/${encodeURIComponent(
		tag
	)}/package.json`

	const res = await fetch(url, {
		cache: 'force-cache',
		next: { revalidate: 300 },
		headers: githubHeaders(),
	})

	if (!res.ok) {
		return null
	}

	try {
		const json = (await res.json()) as PackageJson
		return json
	} catch {
		return null
	}
}

interface ReleaseInfoLatest {
	version: string
	date: string
	notes: string
	assets: ReleaseAsset[]
	electronCurrent?: string
	chromiumCurrent?: string
	nodeJsCurrent?: string
	v8Current?: string
}

export async function getLatestRelease(): Promise<{
	release: ReleaseInfoLatest | null
	error: string | null
}> {
	try {
		const res = await fetch('https://api.github.com/repos/Devollox/void-presence/releases/latest', {
			cache: 'force-cache',
			next: { revalidate: 300 },
			headers: githubHeaders(),
		})

		if (!res.ok) {
			throw new Error('GitHub response not ok')
		}

		const data = await res.json()
		const rawAssets = Array.isArray(data.assets) ? data.assets : []

		const assets: ReleaseAsset[] = mapReleaseAssets(rawAssets)

		const notes = normalizeReleaseNotes(data.body || '')
		const electronVersion = parseElectronVersionFromNotes(notes)
		const chromiumVersion = parseChromiumVersionFromNotes(notes)
		const nodeJsVersion = parseNodeJsVersionFromNotes(notes)
		const v8Version = parseV8VersionFromNotes(notes)

		const pkg = await getPackageJsonByTag(data.tag_name)
		const pkgMeta = extractPackageMeta(pkg)
		const electronFromPkg =
			pkgMeta?.dependencies.find(dep => dep.key === 'electron')?.value ??
			pkg?.dependencies?.electron ??
			pkg?.devDependencies?.electron

		const release: ReleaseInfoLatest = {
			version: data.tag_name,
			date: data.published_at ? new Date(data.published_at).toISOString().slice(0, 10) : '',
			notes,
			assets,
			electronCurrent: electronVersion || electronFromPkg || undefined,
			chromiumCurrent: chromiumVersion || undefined,
			nodeJsCurrent: nodeJsVersion || undefined,
			v8Current: v8Version || undefined,
		}

		return { release, error: null }
	} catch {
		return {
			release: null,
			error: 'Failed to load download information. Please try again later.',
		}
	}
}
