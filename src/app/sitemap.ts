import { MetadataRoute } from 'next'

const siteUrl = 'https://voidpresence.site'

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: siteUrl,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 1,
		},
		{
			url: `${siteUrl}/download`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.9,
		},
		{
			url: `${siteUrl}/docs`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.8,
		},
		{
			url: `${siteUrl}/presence`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${siteUrl}/statuses`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${siteUrl}/plugins`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${siteUrl}/plugins/docs`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.6,
		},
		{
			url: `${siteUrl}/status`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.6,
		},
		{
			url: `${siteUrl}/signin`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.5,
		},
		{
			url: `${siteUrl}/profile`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.5,
		},
		{
			url: `${siteUrl}/schedule/application`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.4,
		},
		{
			url: `${siteUrl}/schedule/installer`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.4,
		},
		{
			url: `${siteUrl}/schedule/updates`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.4,
		},
	]
}
