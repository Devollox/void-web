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

const endpoints: ApiEndpoint[] = [
	{
		id: 'application',
		method: 'GET',
		path: '/v1/github/application',
		title: 'Get application release',
		description:
			'Returns the latest release tag and Windows installer asset for the main Void Presence application from GitHub.',
		group: 'internal',
		hasExample: true,
		samplePayload: {
			tag: 'vX.Y.Z',
			assetName: 'Void.Presence.Setup.exe',
			downloadUrl:
				'https://github.com/Devollox/void-presence/releases/download/vX.Y.Z/Void.Presence.Setup.exe',
		},
	},
	{
		id: 'updates',
		method: 'GET',
		path: '/v1/github/updates',
		title: 'Get updates app release',
		description:
			'Returns the latest release tag and Windows installer asset for the Void Presence Updates helper app from GitHub.',
		group: 'internal',
		hasExample: true,
		samplePayload: {
			tag: 'vX.Y.Z',
			assetName: 'Void.Presence.Updates.X.Y.Z.exe',
			downloadUrl:
				'https://github.com/Devollox/void-updates/releases/download/vX.Y.Z/Void.Presence.Updates.X.Y.Z.exe',
		},
	},
	{
		id: 'installer',
		method: 'GET',
		path: '/v1/github/installer',
		title: 'Get installer app release',
		description:
			'Returns the latest release tag and Windows installer asset for the Void Presence Installer app from GitHub.',
		group: 'internal',
		hasExample: true,
		samplePayload: {
			tag: 'vX.Y.Z',
			assetName: 'Void.Installer.X.Y.Z.exe',
			downloadUrl:
				'https://github.com/Devollox/void-installer/releases/download/vX.Y.Z/Void.Installer.X.Y.Z.exe',
		},
	},
	{
		id: 'presence-get-all',
		method: 'GET',
		path: '/v1/presence',
		title: 'Get all presence configs',
		description:
			'Returns a list of all presence configuration documents from the realtime database.',
		group: 'presence',
		hasExample: true,
		samplePayload: [
			{
				id: 'presence-id',
				title: 'Presence title',
				author: 'Author name',
				authorId: 'author-id',
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
	{
		id: 'presence-get-config',
		method: 'GET',
		path: '/v1/presence/{id}',
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
	},
	{
		id: 'presence-copy',
		method: 'GET',
		path: '/v1/presence/{id}/copy',
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
	},
	{
		id: 'presence-download-json',
		method: 'GET',
		path: '/v1/presence/{id}/download',
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
	},
	{
		id: 'presence-by-author-get',
		method: 'GET',
		path: '/v1/presence/{id}/user',
		title: 'Get presence configs by author',
		description:
			'Returns all presence configs authored by the given user ID, enriched with author metadata.',
		group: 'presence',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			configs: [
				{
					id: 'presence-id',
					title: 'Presence title',
					author: 'Author name',
					authorId: 'author-id',
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
	},
	{
		id: 'presence-track-open',
		method: 'POST',
		path: '/v1/presence/{id}/track-open',
		title: 'Track presence open',
		description:
			'Signals that a presence config has been opened in the app and increments analytics counters.',
		group: 'analytics',
		hasExample: true,
		samplePayload: {
			ok: true,
		},
	},
	{
		id: 'presence-delete',
		method: 'DELETE',
		path: '/v1/presence/{id}',
		title: 'Delete presence config',
		description:
			'Deletes a presence config by Firebase ID from the realtime database. Returns ok: true on success.',
		group: 'presence',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			ok: true,
		},
	},
	{
		id: 'statuses-get-all',
		method: 'GET',
		path: '/v1/statuses',
		title: 'Get all status configs',
		description: 'Returns a list of all status configuration documents from the realtime database.',
		group: 'statuses',
		hasExample: true,
		samplePayload: [
			{
				id: 'status-id',
				title: 'Status title',
				author: 'Author name',
				authorId: 'author-id',
				authorAvatar: 'https://example.com/avatar.png',
				downloads: 0,
				description: 'Status description',
				configData: {
					statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
				},
			},
		],
	},
	{
		id: 'statuses-get-config',
		method: 'GET',
		path: '/v1/statuses/{id}',
		title: 'View status config',
		description:
			'Returns only the raw config payload of a status config for easy browser view or clipboard copying.',
		group: 'statuses',
		authRequired: false,
		hasExample: true,
		samplePayload: {
			statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
		},
	},
	{
		id: 'statuses-copy',
		method: 'GET',
		path: '/v1/statuses/{id}/copy',
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
	},
	{
		id: 'statuses-download-json',
		method: 'GET',
		path: '/v1/statuses/{id}/download',
		title: 'Download status JSON',
		description:
			'Returns only the config of a status config as a downloadable JSON file and increments download counters.',
		group: 'statuses',
		hasExample: true,
		samplePayload: {
			statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
		},
	},
	{
		id: 'statuses-by-author-get',
		method: 'GET',
		path: '/v1/statuses/{id}/user',
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
					authorId: 'author-id',
					authorAvatar: 'https://example.com/avatar.png',
					downloads: 0,
					description: 'Status description',
					configData: {
						statusCycles: [{ text: 'First status line' }, { text: 'Second status line' }],
					},
				},
			],
		},
	},
	{
		id: 'statuses-track-open',
		method: 'POST',
		path: '/v1/statuses/{id}/track-open',
		title: 'Track status open',
		description:
			'Signals that a status config has been opened in the app and increments analytics counters.',
		group: 'analytics',
		hasExample: true,
		samplePayload: {
			ok: true,
		},
	},
	{
		id: 'statuses-delete',
		method: 'DELETE',
		path: '/v1/statuses/{id}',
		title: 'Delete status config',
		description:
			'Deletes a status config by Firebase ID from the realtime database. Returns ok: true on success.',
		group: 'statuses',
		authRequired: true,
		hasExample: true,
		samplePayload: {
			ok: true,
		},
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
	},
]

export default function ApiDocsPage() {
	return (
		<Page>
			<PageHeader
				title='API endpoints'
				subtitle='Browse HTTP endpoints in the same layout as your release schedule.'
			/>
			<ApiDocsClient initialEndpoints={endpoints} />
			<Footer />
		</Page>
	)
}
