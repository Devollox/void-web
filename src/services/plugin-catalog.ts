import 'server-only'
import catalogue from '../../plugins/plugins-manifest.json'

export interface CataloguePlugin {
	id: string
	title: string
	version: string
	sourceUrl: string
	folder: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readPlugin(value: unknown): CataloguePlugin | null {
	if (!isRecord(value)) return null

	if (typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.id)) {
		return null
	}

	if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 256) {
		return null
	}

	if (typeof value.version !== 'string' || !value.version.trim() || value.version.length > 64) {
		return null
	}

	if (
		typeof value.sourceUrl !== 'string' ||
		value.sourceUrl.length > 2048 ||
		typeof value.folder !== 'boolean'
	) {
		return null
	}

	let url: URL

	try {
		url = new URL(value.sourceUrl)
	} catch {
		return null
	}

	if (
		url.protocol !== 'https:' ||
		url.username ||
		url.password ||
		url.port ||
		url.search ||
		url.hash
	) {
		return null
	}

	if (value.folder) {
		if (
			url.hostname !== 'github.com' ||
			!/^\/Devollox\/void-web\/tree\/[^/]+\/plugins\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)
		) {
			return null
		}
	} else {
		if (
			url.hostname !== 'raw.githubusercontent.com' ||
			!/^\/Devollox\/void-web\/[^/]+\/plugins\/[a-zA-Z0-9_-]+\.js$/.test(url.pathname)
		) {
			return null
		}
	}

	return {
		id: value.id,
		title: value.title.trim(),
		version: value.version.trim(),
		sourceUrl: url.href,
		folder: value.folder,
	}
}

export function getCataloguePlugin(id: string): CataloguePlugin | null {
	const entries: unknown = catalogue

	if (!Array.isArray(entries)) {
		throw new Error('Plugin catalogue must be an array.')
	}

	const matches = entries.filter(entry => isRecord(entry) && entry.id === id)

	if (matches.length === 0) return null

	if (matches.length !== 1) {
		throw new Error('Duplicate plugin ID in catalogue.')
	}

	const plugin = readPlugin(matches[0])

	if (!plugin) {
		throw new Error('Invalid plugin catalogue entry.')
	}

	return plugin
}
