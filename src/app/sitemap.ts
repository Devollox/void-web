import type { MetadataRoute } from 'next'

const siteUrl = 'https://voidpresence.com'

const createRoute = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
	url: `${siteUrl}${path}`,
	changeFrequency: 'monthly',
	priority,
})

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		createRoute('/', 1),
		createRoute('/download', 0.9),
		createRoute('/signin', 0.9),
		createRoute('/docs', 0.8),
		createRoute('/plugins/docs', 0.8),
		createRoute('/presence', 0.7),
		createRoute('/statuses', 0.7),
		createRoute('/plugins', 0.7),
		createRoute('/schedule/application', 0.6),
		createRoute('/schedule/installer', 0.6),
		createRoute('/schedule/updates', 0.6),
		createRoute('/schedule/application/downloads', 0.6),
		createRoute('/schedule/installer/downloads', 0.6),
		createRoute('/schedule/updates/downloads', 0.6),
	]
}
