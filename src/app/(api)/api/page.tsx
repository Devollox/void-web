import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import type { ApiEndpoint } from './api-client'
import { ApiDocsClient } from './api-docs-client'

export const metadata: Metadata = {
	title: 'API endpoints',
	description: 'HTTP endpoints for Void Presence.',
	openGraph: {
		title: 'Void Presence API endpoints',
		description:
			'Browse the HTTP API endpoints for Void Presence, including presence configs, status cycles and session info.',
		url: '/api',
	},
}

const API_BASE_V1 = 'https://api.voidpresence.site'

const endpoints: ApiEndpoint[] = [
	{
		id: 'github-releases',
		method: 'POST',
		path: '/v1/github/releases',
		title: 'Get latest GitHub release',
		description:
			'Returns latest release info from GitHub for the selected Void Presence app (application, installer or updates).',
		group: 'internal',
		hasExample: true,
		samplePayload: {
			requestBody: {
				app: 'void-presence',
			},
			responseBody: {
				tag: 'vX.Y.Z',
				assetName: 'Void.Presence.Setup.X.Y.Z.exe',
				downloadUrl:
					'https://github.com/Devollox/void-presence/releases/download/vX.Y.Z/Void.Presence.Setup.X.Y.Z.exe',
				body: 'vX.Y.Z release notes body text here.',
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/github/releases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app: 'void-presence' }), // or 'void-installer' / 'void-updates'
})
  .then(res => res.json())
  .then(info => console.log(info))`,
	},

	{
		id: 'author-add-config-presence',
		method: 'POST',
		path: '/v1/authors/{id}/add-config',
		title: 'Create presence or status config',
		description:
			'Creates a new presence or status config for the given author ID. The author ID is taken from the URL, and configs are linked under users/configs while public configs do not contain authorId.',
		group: 'presence',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			requestBody: {
				kind: 'presence',
				title: 'Presence title',
				author: 'Author name',
				description: 'Presence description',
				configData: {
					cycles: [
						{
							details: 'Details line',
							state: 'State line',
						},
					],
					imageCycles: [
						{
							largeImage: 'https://example.com/large-image.png',
							largeText: 'Large image text',
							smallImage: 'https://example.com/small-image.png',
							smallText: 'Small image text',
						},
					],
					buttonPairs: [
						{
							label1: 'Button 1 label',
							url1: 'https://example.com/button-1',
							label2: 'Button 2 label',
							url2: 'https://example.com/button-2',
						},
					],
				},
				downloads: 0,
				uploadedAt: 1719950000000,
				averageColor: '#ffffff',
			},
			responseBody: {
				id: 'new-config-id',
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/authors/author-id/add-config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'presence',
    title: 'Presence title',
    author: 'Author name',
    description: 'Presence description',
    configData: {
      cycles: [
        { details: 'Details line', state: 'State line' }
      ],
      imageCycles: [
        {
          largeImage: 'https://example.com/large-image.png',
          largeText: 'Large image text',
          smallImage: 'https://example.com/small-image.png',
          smallText: 'Small image text'
        }
      ],
      buttonPairs: [
        {
          label1: 'Button 1 label',
          url1: 'https://example.com/button-1',
          label2: 'Button 2 label',
          url2: 'https://example.com/button-2'
        }
      ]
    },
    downloads: 0,
    uploadedAt: Date.now(),
    averageColor: '#ffffff'
  }),
})
  .then(res => res.json())
  .then(result => console.log(result.id))`,
	},

	{
		id: 'presence-get-all',
		method: 'GET',
		path: '/v1/configs/presence',
		title: 'Get all presence configs',
		description:
			'Returns a list of all presence configuration documents from the realtime database, without exposing internal author IDs.',
		group: 'presence',
		hasExample: true,
		samplePayload: [
			{
				id: 'presence-id',
				title: 'Presence title',
				author: 'Author name',
				authorAvatar: 'https://example.com/avatar.png',
				downloads: 0,
				description: 'Presence description',
				averageColor: '#ffffff',
				configData: {
					cycles: [
						{
							details: 'Details line',
							state: 'State line',
						},
					],
					imageCycles: [
						{
							largeImage: 'https://example.com/large-image.png',
							largeText: 'Large image text',
							smallImage: 'https://example.com/small-image.png',
							smallText: 'Small image text',
						},
					],
					buttonPairs: [
						{
							label1: 'Button 1 label',
							url1: 'https://example.com/button-1',
							label2: 'Button 2 label',
							url2: 'https://example.com/button-2',
						},
					],
				},
			},
		],
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence')
  .then(res => res.json())
  .then(configs => console.log(configs))`,
	},
	{
		id: 'presence-get-config',
		method: 'GET',
		path: '/v1/configs/presence/{id}',
		title: 'View presence config',
		description:
			'Returns only the raw config payload of a presence config for easy browser view or clipboard copying.',
		group: 'presence',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			cycles: [
				{
					details: 'Details line',
					state: 'State line',
				},
			],
			imageCycles: [
				{
					largeImage: 'https://example.com/large-image.png',
					largeText: 'Large image text',
					smallImage: 'https://example.com/small-image.png',
					smallText: 'Small image text',
				},
			],
			buttonPairs: [
				{
					label1: 'Button 1 label',
					url1: 'https://example.com/button-1',
					label2: 'Button 2 label',
					url2: 'https://example.com/button-2',
				},
			],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence/presence-id')
  .then(res => res.json())
  .then(config => console.log(config))`,
	},
	{
		id: 'presence-copy',
		method: 'GET',
		path: '/v1/configs/presence/{id}/copy',
		title: 'Copy presence config',
		description:
			'Creates a duplicate of the given presence config with a new ID while preserving metadata and config.',
		group: 'presence',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			ok: true,
			id: 'new-presence-id',
			sourceId: 'original-presence-id',
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence/presence-id/copy')
  .then(res => res.json())
  .then(result => console.log(result))`,
	},
	{
		id: 'presence-download-json',
		method: 'GET',
		path: '/v1/configs/presence/{id}/download',
		title: 'Download presence JSON',
		description:
			'Returns only the config of a presence config as a downloadable JSON file and increments download counters.',
		group: 'presence',
		hasExample: true,
		samplePayload: {
			cycles: [
				{
					details: 'Details line',
					state: 'State line',
				},
			],
			imageCycles: [
				{
					largeImage: 'https://example.com/large-image.png',
					largeText: 'Large image text',
					smallImage: 'https://example.com/small-image.png',
					smallText: 'Small image text',
				},
			],
			buttonPairs: [
				{
					label1: 'Button 1 label',
					url1: 'https://example.com/button-1',
					label2: 'Button 2 label',
					url2: 'https://example.com/button-2',
				},
			],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence/presence-id/download')
  .then(res => res.json())
  .then(config => console.log(config))`,
	},
	{
		id: 'presence-by-author-get',
		method: 'GET',
		path: '/v1/configs/presence/{id}/user',
		title: 'Get presence configs by author',
		description:
			'Returns all presence configs authored by the given user ID, enriched with author metadata while keeping internal IDs hidden from config documents.',
		group: 'presence',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			configs: [
				{
					id: 'presence-id',
					title: 'Presence title',
					author: 'Author name',
					authorAvatar: 'https://example.com/avatar.png',
					downloads: 0,
					description: 'Presence description',
					averageColor: '#ffffff',
					configData: {
						cycles: [
							{
								details: 'Details line',
								state: 'State line',
							},
						],
						imageCycles: [
							{
								largeImage: 'https://example.com/large-image.png',
								largeText: 'Large image text',
								smallImage: 'https://example.com/small-image.png',
								smallText: 'Small image text',
							},
						],
						buttonPairs: [
							{
								label1: 'Button 1 label',
								url1: 'https://example.com/button-1',
								label2: 'Button 2 label',
								url2: 'https://example.com/button-2',
							},
						],
					},
				},
			],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence/author-id/user')
  .then(res => res.json())
  .then(result => console.log(result.configs))`,
	},
	{
		id: 'presence-delete',
		method: 'DELETE',
		path: '/v1/configs/presence/{id}',
		title: 'Delete presence config',
		description:
			'Deletes a presence config by Firebase ID from the realtime database and unlinks it from user configs. Returns ok: true on success.',
		group: 'presence',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			ok: true,
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/presence/presence-id', { method: 'DELETE' })
  .then(res => res.json())
  .then(result => console.log(result))`,
	},

	{
		id: 'statuses-get-all',
		method: 'GET',
		path: '/v1/configs/statuses',
		title: 'Get all status configs',
		description: 'Returns a list of all status configuration documents from the realtime database.',
		group: 'statuses',
		hasExample: true,
		samplePayload: [
			{
				id: 'status-id',
				title: 'Status title',
				author: 'Author name',
				authorAvatar: 'https://example.com/avatar.png',
				downloads: 0,
				description: 'Status description',
				configData: {
					statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
				},
			},
		],
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses')
  .then(res => res.json())
  .then(configs => console.log(configs))`,
	},
	{
		id: 'statuses-get-config',
		method: 'GET',
		path: '/v1/configs/statuses/{id}',
		title: 'View status config',
		description:
			'Returns only the raw config payload of a status config for easy browser view or clipboard copying.',
		group: 'statuses',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses/status-id')
  .then(res => res.json())
  .then(config => console.log(config))`,
	},
	{
		id: 'statuses-copy',
		method: 'GET',
		path: '/v1/configs/statuses/{id}/copy',
		title: 'Copy status config',
		description:
			'Creates a duplicate of the given status config with a new ID while preserving metadata and config.',
		group: 'statuses',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			ok: true,
			id: 'new-status-id',
			sourceId: 'original-status-id',
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses/status-id/copy')
  .then(res => res.json())
  .then(result => console.log(result))`,
	},
	{
		id: 'statuses-download-json',
		method: 'GET',
		path: '/v1/configs/statuses/{id}/download',
		title: 'Download status JSON',
		description:
			'Returns only the config of a status config as a downloadable JSON file and increments download counters.',
		group: 'statuses',
		hasExample: true,
		samplePayload: {
			statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses/status-id/download')
  .then(res => res.json())
  .then(config => console.log(config))`,
	},
	{
		id: 'statuses-by-author-get',
		method: 'GET',
		path: '/v1/configs/statuses/{id}/user',
		title: 'Get status configs by author',
		description:
			'Returns all status configs authored by the given user ID, enriched with author metadata.',
		group: 'statuses',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			configs: [
				{
					id: 'status-id',
					title: 'Status title',
					author: 'Author name',
					authorAvatar: 'https://example.com/avatar.png',
					downloads: 0,
					description: 'Status description',
					configData: {
						statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
					},
				},
			],
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses/author-id/user')
  .then(res => res.json())
  .then(result => console.log(result.configs))`,
	},
	{
		id: 'statuses-delete',
		method: 'DELETE',
		path: '/v1/configs/statuses/{id}',
		title: 'Delete status config',
		description:
			'Deletes a status config by Firebase ID from the realtime database and unlinks it from user configs. Returns ok: true on success.',
		group: 'statuses',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			ok: true,
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/statuses/status-id', { method: 'DELETE' })
  .then(res => res.json())
  .then(result => console.log(result))`,
	},

	{
		id: 'analytics-app',
		method: 'POST',
		path: '/v1/analytics/app',
		title: 'Track app analytics',
		description: 'Tracks global app analytics such as total visitors and installer downloads.',
		group: 'analytics',
		hasExample: true,
		authRequired: true,
		samplePayload: {
			requestBody: {
				type: 'app_download',
				channel: 'installer',
				meta: {
					platform: 'windows',
					version: '2.5.0',
				},
			},
			responseBody: {
				ok: true,
				type: 'app_download',
				stats: {
					count: 123,
					lastUpdated: 1719950000000,
				},
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/analytics/app', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'app_download',
    channel: 'installer',
  }),
})
  .then(res => res.json())
  .then(result => console.log(result))`,
	},
	{
		id: 'analytics-track',
		method: 'POST',
		path: '/v1/analytics/configs',
		title: 'Track analytics event',
		description:
			'Records analytics events such as downloads for presence configs and statuses using a unified payload.',
		group: 'analytics',
		hasExample: true,
		samplePayload: {
			requestBody: {
				type: 'status_download',
				id: 'status-id',
				client: 'void-desktop',
				meta: {
					platform: 'windows',
					version: '2.5.0',
				},
			},
			responseBody: {
				ok: true,
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/analytics/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'status_download', id: 'status-id' }),
})
  .then(res => res.json())
  .then(result => console.log(result))`,
	},

	{
		id: 'auth-session',
		method: 'GET',
		path: '/api/auth/session',
		title: 'Get current session',
		description: 'Returns the current next-auth session including provider details and tokens.',
		group: 'auth',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			user: {
				name: 'User name',
				email: 'user@example.com',
				image: 'https://example.com/avatar.png',
			},
			expires: '2026-07-01T21:59:00.000Z',
			provider: 'discord',
			accessToken: 'access-token',
			firebaseToken: 'firebase-custom-token',
		},
		fetchPayload: `fetch('https://voidpresence.site/api/auth/session')
  .then(res => res.json())
  .then(session => console.log(session))`,
	},
	{
		id: 'auth-signin-provider',
		method: 'GET',
		path: '/api/auth/signin/{provider}',
		title: 'Start OAuth sign-in',
		description:
			'Starts OAuth sign-in for the given provider and redirects to the provider authorization page.',
		group: 'auth',
		hasExample: false,
		samplePayload: {
			redirect: true,
			provider: 'discord',
			url: 'https://discord.com/oauth2/authorize?...',
		},
		fetchPayload: `window.location.href = 'https://voidpresence.site/api/auth/signin/discord'`,
	},
	{
		id: 'auth-callback-provider',
		method: 'GET',
		path: '/api/auth/callback/{provider}',
		title: 'Handle OAuth callback',
		description: 'Route used by next-auth to handle OAuth callbacks for configured providers.',
		group: 'internal',
		hasExample: false,
		samplePayload: {
			ok: true,
			provider: 'discord',
		},
		fetchPayload: `fetch('https://voidpresence.site/api/auth/callback/discord')
  .then(res => res.json())
  .then(result => console.log(result))`,
	},
	{
		id: 'auth-steam-bridge',
		method: 'GET',
		path: '/api/auth/fuckoffnextauth/{provider}',
		title: 'Steam OAuth bridge',
		description:
			'Custom bridge route used by the Steam provider to normalize callback parameters before passing them to next-auth.',
		group: 'internal',
		hasExample: true,
		samplePayload: {
			ok: true,
			provider: 'steam',
			normalizedParams: {
				state: 'state-value',
				code: 'authorization-code',
				redirectUri: 'https://example.com/callback',
			},
		},
		fetchPayload: `fetch('https://voidpresence.site/api/auth/fuckoffnextauth/steam?state=state-value&code=authorization-code&redirectUri=https://example.com/callback')
  .then(res => res.json())
  .then(result => console.log(result.normalizedParams))`,
	},
]

export default function ApiDocsPage() {
	return (
		<Page isApiHost={true}>
			<PageHeader
				title='API endpoints'
				subtitle='Browse HTTP endpoints in the same layout as your release schedule.'
			/>
			<ApiDocsClient initialEndpoints={endpoints} />
			<Footer />
		</Page>
	)
}
