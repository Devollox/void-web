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

async function fetchPlugins(): Promise<Plugin[]> {
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

export default async function PluginsPage() {
	const plugins = await fetchPlugins()

	return <PluginsSection initialPlugins={plugins} initialTotal={plugins.length} />
}
