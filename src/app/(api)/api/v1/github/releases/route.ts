import { githubHeaders } from '@/lib/github-headers'
import { NextResponse } from 'next/server'

type LatestReleaseInfo = {
	tag: string
	assetName: string
	downloadUrl: string
	body: string
}

type GithubAsset = {
	name: string
	browser_download_url: string
}

type GithubRelease = {
	tag_name?: string
	name: string
	body?: string
	assets: GithubAsset[]
}

type GithubApp = 'void-presence' | 'void-installer' | 'void-updates'

interface GithubReleasePayload {
	app: GithubApp
}

async function fetchLatestReleaseFromGithub(app: GithubApp): Promise<LatestReleaseInfo> {
	const url = `https://api.github.com/repos/Devollox/${app}/releases/latest`

	const res = await fetch(url, {
		method: 'GET',
		headers: githubHeaders(),
		cache: 'no-store',
	})

	if (!res.ok) {
		const body = await res.text().catch(() => '')
		throw new Error(`Bad status from GitHub: ${res.status} ${res.statusText} ${body}`)
	}

	const data = (await res.json()) as GithubRelease

	let assetName = ''
	let downloadUrl = ''

	if (Array.isArray(data.assets) && data.assets.length > 0) {
		let selected = data.assets[0]
		for (const a of data.assets) {
			if (a.name.toLowerCase().endsWith('.exe')) {
				selected = a
				break
			}
		}
		assetName = selected?.name ?? ''
		downloadUrl = selected?.browser_download_url ?? ''
	}

	return {
		tag: data.tag_name ?? '',
		assetName,
		downloadUrl,
		body: (data.body || '').trim(),
	}
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as GithubReleasePayload

		if (!body || !body.app) {
			return NextResponse.json(
				{ error: 'Invalid payload', message: 'app is required' },
				{ status: 400 }
			)
		}

		let app: GithubApp

		switch (body.app) {
			case 'void-presence':
			case 'void-installer':
			case 'void-updates':
				app = body.app
				break
			default:
				return NextResponse.json({ error: 'Unknown app', app: body.app }, { status: 400 })
		}

		const info = await fetchLatestReleaseFromGithub(app)

		return NextResponse.json(info, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
