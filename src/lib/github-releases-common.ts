import { githubHeaders } from '@/lib/github-headers'

export interface ReleaseAsset {
	name: string
	size: number
	downloadUrl: string
}

export interface ReleaseDownloadsItem {
	tag: string
	name: string | null
	totalDownloads: number
}

export type ReleaseType = 'stable' | 'pre-release' | 'nightly' | 'end of life' | 'broken'

export interface BaseReleaseInfo {
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
}

export interface FetchAllResult<T = any> {
	data: T[] | null
	error: number | null
}

export async function fetchAllReleases(repo: string): Promise<FetchAllResult> {
	const all: any[] = []
	let page = 1
	const perPage = 100
	const maxPages = 20

	while (page <= maxPages) {
		const res = await fetch(
			`https://api.github.com/repos/Devollox/${repo}/releases?per_page=${perPage}&page=${page}`,
			{
				cache: 'force-cache',
				next: { revalidate: 300 },
				headers: githubHeaders(),
			}
		)

		if (!res.ok) {
			return { data: null, error: res.status }
		}

		const data = await res.json()
		if (!Array.isArray(data) || data.length === 0) break

		all.push(...data)

		if (data.length < perPage) break
		page++
	}

	return { data: all, error: null }
}

export function mapReleaseAssets(rawAssets: any[]): ReleaseAsset[] {
	return rawAssets
		.map((asset: any) => ({
			name: asset.name,
			size: asset.size / (1024 * 1024),
			downloadUrl: asset.browser_download_url,
		}))
		.sort((a: ReleaseAsset, b: ReleaseAsset) => {
			const isInstaller = (name: string) => {
				const n = name.toLowerCase()
				return n.endsWith('.exe') || n.endsWith('.dmg') || n.endsWith('.deb') || n.endsWith('.rpm')
			}
			const aInst = isInstaller(a.name)
			const bInst = isInstaller(b.name)
			if (aInst && !bInst) return -1
			if (bInst && !aInst) return 1
			return 0
		})
}

export function formatDate(input: string) {
	if (!input) return 'Unknown'
	const date = new Date(input)
	if (Number.isNaN(date.getTime())) return input
	return date.toISOString().slice(0, 10)
}

export function getSortDate(release: { publishedAt: string; date: string }): Date {
	if (release.publishedAt) {
		const d = new Date(release.publishedAt)
		if (!Number.isNaN(d.getTime())) return d
	}
	if (release.date !== 'Unknown') {
		const d = new Date(release.date)
		if (!Number.isNaN(d.getTime())) return d
	}
	return new Date(0)
}

export function compareVersionsDesc(a: string, b: string): number {
	return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
}

export function applyBuildTagPriority<
	T extends { buildTag?: string | undefined; type: ReleaseType },
>(releases: T[]): T[] {
	return releases.map(release => {
		const tag = release.buildTag
		let type: ReleaseType | null = null

		if (tag === 'nightly') type = 'nightly'
		else if (tag === 'stable') type = 'stable'
		else if (tag === 'pre-release' || tag === 'prerelease') type = 'pre-release'

		if (!type) return release
		return { ...release, type }
	})
}
