import { githubHeaders } from '@/lib/github-headers'
import { NextResponse } from 'next/server'
import { LatestReleaseInfo } from '../../../v1/github/releases/route'
import { GithubReleasePayload, OsPlatform, selectAsset } from '../../../v2/github/releases/route'

async function fetchLatestReleaseFromGithub(platform: OsPlatform): Promise<LatestReleaseInfo> {
	const headers = githubHeaders()

	const [resApp, resUpdates] = await Promise.all([
		fetch('https://api.github.com/repos/Devollox/void-presence/releases/latest', {
			method: 'GET',
			headers,
			cache: 'no-store',
		}),
		fetch('https://api.github.com/repos/Devollox/void-updates/releases/latest', {
			method: 'GET',
			headers,
			cache: 'no-store',
		}),
	])

	if (!resApp.ok || !resUpdates.ok) {
		throw new Error(`Bad status from GitHub`)
	}

	const application = await resApp.json()
	const updates = await resUpdates.json()

	let assetName = ''
	let downloadUrl = ''

	if (Array.isArray(application.assets) && application.assets.length > 0) {
		const selected = selectAsset(application.assets, platform) ?? application.assets[0]
		const rawName = selected?.name ?? ''
		assetName = rawName.replace('Setup', 'Updates')
		downloadUrl = `https://github.com/Devollox/void-updates/releases/download/${updates.name}/${assetName}`
	}

	return {
		tag: application.tag_name ?? '',
		assetName,
		downloadUrl,
		body: (application.body || '').trim(),
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

		switch (body.app) {
			case 'void-presence':
			case 'void-installer':
			case 'void-updates':
				break
			default:
				return NextResponse.json({ error: 'Unknown app', app: body.app }, { status: 400 })
		}

		let platform: OsPlatform = 'windows'
		if (body.platform === 'macos' || body.platform === 'linux') {
			platform = body.platform
		}

		const info = await fetchLatestReleaseFromGithub(platform)

		return NextResponse.json(info, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'Internal error', message }, { status: 500 })
	}
}
