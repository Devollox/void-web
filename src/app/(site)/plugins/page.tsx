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
			{
				cache: 'no-store',
			}
		)
		if (!res.ok) return null
		const data = await res.json()
		return data as Plugin
	} catch {
		return null
	}
}

export default async function PluginsPage() {
	const manifestPlugins = await fetchManifestPlugins()

	const merged: Plugin[] = []

	for (const p of manifestPlugins) {
		const fb = await fetchFirebasePlugin(p.id)
		if (fb) {
			merged.push({
				...p,
				downloads: fb.downloads,
			})
		} else {
			merged.push({
				...p,
				downloads:
					typeof (p as any).downloads === 'number'
						? (p as any).downloads
						: parseInt(String((p as any).downloads ?? '0')) || 0,
			})
		}
	}

	return <PluginsSection initialPlugins={merged} initialTotal={merged.length} />
}
