import { githubHeaders } from '@/lib/github-headers'
import { NextResponse } from 'next/server'

type LatestReleaseInfo = {
	tag: string
	assetName: string
	downloadUrl: string
}

type GithubAsset = {
	name: string
	browser_download_url: string
}

type GithubRelease = {
	tag_name: string
	name: string
	assets: GithubAsset[]
}

export async function GET() {
	try {
		const res = await fetch(
			'https://api.github.com/repos/Devollox/void-installer/releases/latest',
			{
				method: 'GET',
				headers: githubHeaders(),
				cache: 'no-store',
			}
		)

		if (!res.ok) {
			const body = await res.text().catch(() => '')
			return NextResponse.json(
				{
					error: 'Bad status from GitHub',
					status: res.status,
					statusText: res.statusText,
					body,
				},
				{ status: 502 }
			)
		}

		const data = (await res.json()) as GithubRelease

		if (!data.assets || data.assets.length === 0) {
			return NextResponse.json({ error: 'No assets in latest release' }, { status: 500 })
		}

		let selected = data.assets[0]
		for (const a of data.assets) {
			if (a.name.toLowerCase().endsWith('.exe')) {
				selected = a
				break
			}
		}

		const info: LatestReleaseInfo = {
			tag: data.tag_name,
			assetName: selected.name,
			downloadUrl: selected.browser_download_url,
		}

		return NextResponse.json(info, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
