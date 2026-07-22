import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { ApiEndpoint } from './api-client'
import { ApiDocsClient } from './api-docs-client'

export const metadata: Metadata = {
	title: 'API endpoints',
	description: 'HTTP endpoints for Void Presence.',
	openGraph: {
		title: 'Void Presence - API endpoints',
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
			'Returns the latest GitHub release info for the selected Void Presence app (desktop app, installer, or auto-updater).',
		group: 'github',
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
  body: JSON.stringify({ app: 'void-presence' }),
})
  .then(res => res.json())
  .then(info => console.log(info))`,
	},
	{
		id: 'github-releases-v2',
		method: 'POST',
		path: '/v2/github/releases',
		title: 'Get latest GitHub release',
		description:
			'Returns the latest GitHub release info for the selected Void Presence app (desktop app, installer, or auto-updater).',
		group: 'github',
		hasExample: true,
		samplePayload: {
			requestBody: {
				app: 'void-presence',
				platform: 'windows',
			},
			responseBody: {
				tag: 'v2.13.13',
				assetName: 'Void.Presence.Setup.2.13.13.exe',
				downloadUrl:
					'https://github.com/Devollox/void-presence/releases/download/v2.13.13/Void.Presence.Setup.2.13.13.exe',
				body: 'Release notes for v2.13.13…',
			},
		},
		fetchPayload: `fetch('https://api.voidpresence.site/v2/github/releases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app: 'void-presence', platform: 'windows' }),
})
  .then(res => res.json())
  .then(info => console.log(info))`,
	},
	{
		id: 'authors-resolve-get',
		method: 'GET',
		path: '/v1/authors/resolve',
		title: 'Resolve author by username and tag',
		description:
			'Resolves an author profile and all their configs by handle (username + tag). Query: ?username=User&tag=1234.',
		group: 'authors',
		hasExample: true,
		samplePayload: {
			responseBody: {
				user: {
					name: 'Author Name',
					avatar: 'https://example.com/avatar.png',
					tag: '1234',
					provider: 'discord',
					createdAt: 123456789,
					lastSeen: 123456789,
				},
				presenceConfigs: [
					{
						id: 'cfg-1',
						title: 'Presence config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Config description',
						averageColors: ['#ffffff'],
						configData: {
							cycles: [{ details: 'Details line', state: 'State line' }],
							imageCycles: [],
							buttonPairs: [],
						},
						uploadedAt: 123456789,
					},
				],
				statusConfigs: [
					{
						id: 'status-1',
						title: 'Status config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Status description',
						configData: { statusCycles: [{ text: 'Example status text' }] },
						uploadedAt: 123456789,
					},
				],
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/authors/resolve?username=Author%20Name&tag=1234')
  .then(res => res.json())
  .then(data => console.log(data))`,
	},
	{
		id: 'authors-resolve-post',
		method: 'POST',
		path: '/v1/authors/resolve',
		title: 'Resolve author by username and tag (JSON)',
		description:
			'Same as GET /v1/authors/resolve but accepts JSON body { username, tag } instead of query parameters.',
		group: 'authors',
		hasExample: true,
		samplePayload: {
			requestBody: {
				username: 'Author Name',
				tag: '1234',
			},
			responseBody: {
				user: {
					name: 'Author Name',
					avatar: 'https://example.com/avatar.png',
					tag: '1234',
					provider: 'discord',
					createdAt: 123456789,
					lastSeen: 123456789,
				},
				presenceConfigs: [
					{
						id: 'cfg-1',
						title: 'Presence config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Config description',
						averageColors: ['#ffffff'],
						configData: {
							cycles: [{ details: 'Details line', state: 'State line' }],
							imageCycles: [],
							buttonPairs: [],
						},
						uploadedAt: 123456789,
					},
				],
				statusConfigs: [
					{
						id: 'status-1',
						title: 'Status config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Status description',
						configData: { statusCycles: [{ text: 'Example status text' }] },
						uploadedAt: 123456789,
					},
				],
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/authors/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'Author Name', tag: '1234' }),
})
  .then(res => res.json())
  .then(data => console.log(data))`,
	},

	{
		id: 'authors-create-config',
		method: 'POST',
		path: '/v1/authors/{authorId}/configs',
		title: 'Create presence or status config',
		description:
			'Creates a new presence or status config for the given authorId (Discord snowflake) and links it under users/{authorId}/configs.',
		group: 'authors',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			requestBody: {
				kind: 'presence',
				title: 'Presence title',
				author: 'Author name',
				description: 'Presence description',
				configData: {
					cycles: [{ details: 'Details line', state: 'State line' }],
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
				uploadedAt: 123456789,
				averageColor: '#ffffff',
			},
			responseBody: {
				id: '123456789',
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/authors/123456789/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'presence',
    title: 'Presence title',
    author: 'Author name',
    description: 'Presence description',
    configData: {
      cycles: [{ details: 'Details line', state: 'State line' }],
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
		id: 'authors-get-configs',
		method: 'GET',
		path: '/v1/authors/{authorId}/configs',
		title: 'Get author profile and configs',
		description:
			'Returns an author profile and all of their presence/status configs by authorId (Discord snowflake). Used by internal profile pages.',
		group: 'authors',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			responseBody: {
				user: {
					id: '123456789',
					name: 'Author Name',
					avatar: 'https://example.com/avatar.png',
					tag: '1234',
					provider: 'discord',
					createdAt: 123456789,
					lastSeen: 123456789,
				},
				presenceConfigs: [
					{
						id: 'cfg-1',
						title: 'Presence config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Config description',
						configData: {
							cycles: [{ details: 'Details line', state: 'State line' }],
							imageCycles: [],
							buttonPairs: [],
						},
						averageColors: ['#ffffff'],
						uploadedAt: 123456789,
					},
				],
				statusConfigs: [
					{
						id: 'status-1',
						title: 'Status config title',
						author: 'Author Name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Status description',
						configData: { statusCycles: [{ text: 'Example status text' }] },
						uploadedAt: 123456789,
					},
				],
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/authors/123456789/configs')
  .then(res => res.json())
  .then(data => console.log(data))`,
	},

	{
		id: 'configs-list',
		method: 'POST',
		path: '/v1/configs',
		title: 'List configs (ranked)',
		description:
			'Returns a ranked slice of presence or status configs (sorted by downloads). Body: { kind, offset?, limit? }. If ranking is empty, falls back to scanning all configs.',
		group: 'configs',
		hasExample: true,
		samplePayload: {
			requestBody: { kind: 'presence' },
			responseBody: {
				items: [
					{
						id: '123456789',
						title: 'Config title',
						author: 'Author name',
						authorAvatar: 'https://example.com/avatar.png',
						authorTag: '1234',
						downloads: 0,
						description: 'Config description',
						averageColors: ['#ffffff'],
						configData: {
							cycles: [{ details: 'Details line', state: 'State line' }],
							imageCycles: [],
							buttonPairs: [],
						},
						uploadedAt: 123456789,
					},
				],
				total: 1,
				offset: 0,
				limit: 24,
			},
		},
		fetchPayload: `fetch('https://voidpresence.site/api/v1/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'presence' }),
})
  .then(res => res.json())
  .then(list => console.log(list))`,
	},
	{
		id: 'config-get-by-id',
		method: 'POST',
		path: '/v1/configs/{id}',
		title: 'Get presence or status config',
		description:
			'Returns a single presence or status config by ID, enriched with author metadata. Body: { kind: "presence" | "status" }.',
		group: 'configs',
		hasExample: true,
		samplePayload: {
			requestBody: { kind: 'presence' },
			responseBody: {
				id: '123456789',
				title: 'Config title',
				author: 'Author name',
				authorAvatar: 'https://example.com/avatar.png',
				authorTag: '1234',
				downloads: 0,
				description: 'Config description',
				configData: {
					cycles: [{ details: 'Details line', state: 'State line' }],
					imageCycles: [],
					buttonPairs: [],
				},
				averageColors: ['#ffffff'],
				uploadedAt: 123456789,
			},
		},
		fetchPayload: `fetch('${API_BASE_V1}/v1/configs/123456789', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'presence' }),
})
  .then(res => res.json())
  .then(config => console.log(config))`,
	},
	{
		id: 'config-download-json',
		method: 'GET',
		path: '/v1/configs/{id}/download',
		title: 'Download config JSON file',
		description:
			'Downloads only the configData of a presence or status config as a JSON file. Query: kind=presence|status.',
		group: 'configs',
		hasExample: true,
		samplePayload: {
			status: '200 OK',
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': 'attachment; filename="Config title.json"',
			},
		},
		fetchPayload: `fetch('https://voidpresence.site/api/v1/configs/123456789/download?kind=presence')
  .then(res => res.blob())
  .then(file => console.log(file))`,
	},
	{
		id: 'config-copy',
		method: 'GET',
		path: '/v1/configs/{id}/copy',
		title: 'Copy config JSON',
		description:
			'Returns only the configData JSON for a presence or status config, suitable for copying or exporting. Query: kind=presence|status.',
		group: 'configs',
		hasExample: true,
		samplePayload: {
			responseBody: {
				cycles: [],
				imageCycles: [],
				buttonPairs: [],
			},
		},
		fetchPayload: `fetch('https://voidpresence.site/api/v1/configs/123456789/copy?kind=presence')
  .then(res => res.json())
  .then(json => console.log(json))`,
	},
	{
		id: 'config-delete',
		method: 'DELETE',
		path: '/v1/configs/{id}/delete',
		title: 'Delete presence or status config',
		description:
			'Deletes a presence or status config and unlinks it from its owner. Query: kind=presence|status.',
		group: 'configs',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			responseBody: {
				ok: true,
			},
		},
		fetchPayload: `fetch('https://voidpresence.site/api/v1/configs/123456789/delete?kind=presence', {
  method: 'DELETE',
})
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
					downloads: {
						count: 123,
						lastUpdated: 123456789,
					},
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
		id: 'analytics-configs',
		method: 'POST',
		path: '/v1/analytics/configs',
		title: 'Track config analytics',
		description:
			'Records analytics events for presence/status configs. Supported types: "status_download", "presence_download".',
		group: 'analytics',
		hasExample: true,
		samplePayload: {
			requestBody: {
				type: 'presence_download',
				id: '123456789',
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
  body: JSON.stringify({ type: 'presence_download', id: '123456789' }),
})
  .then(res => res.json())
  .then(result => console.log(result))`,
	},

	{
		id: 'auth-session',
		method: 'GET',
		path: '/api/auth/session',
		title: 'Get current session',
		description:
			'Returns the current next-auth session including provider details and any extra tokens exposed via callbacks.',
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
		group: 'auth',
		hasExample: false,
	},
	{
		id: 'auth-steam-bridge',
		method: 'GET',
		path: '/api/auth/fuckoffnextauth/{provider}',
		title: 'Steam OAuth bridge',
		description:
			'Custom bridge route used by the Steam provider to normalize callback parameters before passing them to next-auth.',
		group: 'auth',
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

	{
		id: 'users-get-profile',
		method: 'GET',
		path: '/api/auth/users/sync',
		title: 'Get user profile',
		description:
			'Returns the current user profile data without configs, looked up by session user id.',
		group: 'users',
		hasExample: true,
		authRequired: true,
		samplePayload: {
			id: '123456789',
			name: 'User Name',
			avatar: 'https://example.com/avatar.png',
			tag: '1234',
			provider: 'discord',
		},
		fetchPayload: `fetch('https://voidpresence.site/api/auth/users/sync')
  .then(res => res.json())
  .then(user => console.log(user))`,
	},
]

export default function ApiDocsPage() {
	return (
		<Page isApiHost={true}>
			<PageHeader
				title='Void Presence API endpoints'
				subtitle='Browse HTTP endpoints in the same layout as your release schedule.'
			/>
			<ApiDocsClient initialEndpoints={endpoints} />
			<Footer />
		</Page>
	)
}
