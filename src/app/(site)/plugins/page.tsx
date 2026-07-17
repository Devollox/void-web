import type { Plugin } from '@service/firebase'
import type { Metadata } from 'next'
import { PluginsSection } from './plugins-section'

export const metadata: Metadata = {
	title: 'Plugins',
	description: 'Browse and install Void Presence community plugins.',
	openGraph: {
		title: 'Void Presence - Plugins',
		description: 'Discover community plugins for Void Presence and install them in one click.',
		url: '/plugins',
	},
}

const MANIFEST_URL =
	'https://raw.githubusercontent.com/Devollox/void-web/main/plugins/plugins-manifest.json'

async function fetchManifestPlugins(): Promise<Plugin[]> {
	try {
		const res = await fetch(MANIFEST_URL, {
			next: { revalidate: 3600 },
		})
		if (!res.ok) return []
		const data = await res.json()
		return Array.isArray(data) ? (data as Plugin[]) : []
	} catch {
		return []
	}
}

async function fetchFirebasePlugin(id: string): Promise<Plugin | null> {
	try {
		const res = await fetch(
			`${process.env.NEXTAUTH_URL}/api/v1/configs/${encodeURIComponent(id)}?kind=plugin`,
			{ cache: 'no-store' }
		)
		if (!res.ok) return null
		return (await res.json()) as Plugin
	} catch {
		return null
	}
}

const githubAvatarCache = new Map<string, string>()

async function fetchGithubAvatar(username: string): Promise<string | null> {
	if (githubAvatarCache.has(username)) return githubAvatarCache.get(username)!
	try {
		const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				...(process.env.GITHUB_TOKEN
					? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
					: {}),
			},
			next: { revalidate: 86400 },
		})
		if (!res.ok) return null
		const data = await res.json()
		const url = (data.avatar_url as string) || null
		if (url) githubAvatarCache.set(username, url)
		return url
	} catch {
		return null
	}
}

export default async function PluginsPage() {
	const manifestPlugins = await fetchManifestPlugins()

	const uniqueAuthors = [...new Set(manifestPlugins.map(p => p.author).filter(Boolean))]
	const avatarResults = await Promise.all(
		uniqueAuthors.map(async author => ({ author, avatar: await fetchGithubAvatar(author) }))
	)
	const avatarMap = new Map(avatarResults.map(r => [r.author, r.avatar]))

	const merged: Plugin[] = []

	for (const p of manifestPlugins) {
		const fb = await fetchFirebasePlugin(p.id)
		merged.push({
			...p,
			downloads:
				fb?.downloads ??
				(typeof (p as any).downloads === 'number'
					? (p as any).downloads
					: parseInt(String((p as any).downloads ?? '0')) || 0),
			authorAvatar: avatarMap.get(p.author) ?? p.authorAvatar ?? null,
		})
	}

	return <PluginsSection initialPlugins={merged} initialTotal={merged.length} />
}
