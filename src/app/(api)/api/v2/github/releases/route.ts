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

type OsPlatform = 'windows' | 'macos' | 'linux'

interface GithubReleasePayload {
	app: GithubApp
	platform?: OsPlatform
}

function selectAsset(assets: GithubAsset[], platform: OsPlatform): GithubAsset | null {
	if (!assets.length) return null

	const ext = (name: string) => name.toLowerCase()

	switch (platform) {
		case 'macos': {
			const dmg = assets.find(a => ext(a.name).endsWith('.dmg'))
			if (dmg) return dmg
			const zip = assets.find(a => ext(a.name).includes('.macos.') && ext(a.name).endsWith('.zip'))
			if (zip) return zip
			return assets.find(a => ext(a.name).endsWith('.zip')) ?? assets[0]
		}

		case 'linux': {
			const deb = assets.find(a => ext(a.name).endsWith('.deb'))
			if (deb) return deb
			const rpm = assets.find(a => ext(a.name).endsWith('.rpm'))
			if (rpm) return rpm
			const bin = assets.find(
				a => ext(a.name).endsWith('.linux') || ext(a.name).includes('.linux.')
			)
			if (bin) return bin
			return assets.find(a => ext(a.name).endsWith('.zip')) ?? assets[0]
		}

		default:
			const exe = assets.find(a => ext(a.name).endsWith('.exe'))
			if (exe) return exe
			return assets.find(a => ext(a.name).endsWith('.zip')) ?? assets[0]
	}
}

async function fetchLatestReleaseFromGithub(
	app: GithubApp,
	platform: OsPlatform
): Promise<LatestReleaseInfo> {
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
		const selected = selectAsset(data.assets, platform) ?? data.assets[0]
		assetName = selected.name
		downloadUrl = selected.browser_download_url
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

		let platform: OsPlatform = 'windows'
		if (body.platform === 'macos' || body.platform === 'linux') {
			platform = body.platform
		}

		const info = await fetchLatestReleaseFromGithub(app, platform)

		return NextResponse.json(info, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
