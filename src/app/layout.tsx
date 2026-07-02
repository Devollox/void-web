import { auth } from '@api/auth/[...nextauth]/route'
import '@styles/globals.scss'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextAuthProvider } from './(site)/providers/session-provider'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const siteUrl = 'https://voidpresence.site'

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: 'Void Presence – Discord Rich Presence Manager',
		template: '%s – Void Presence',
	},
	description:
		'Advanced Discord Rich Presence manager with customizable profiles, buttons, status cycles, images, and flexible update intervals for your Discord activity.',
	applicationName: 'Void Presence',
	authors: [{ name: 'Devollox', url: siteUrl }],
	keywords: [
		'discord',
		'discord rich presence',
		'discord rpc',
		'discord status',
		'discord activity status',
		'discord custom status',
		'discord presence app',
		'discord presence manager',
		'discord rich presence manager',
		'discord rich presence client',
		'rich presence manager',
		'rich presence app',
		'discord game status',
		'discord now playing status',
		'discord profile status',
		'custom discord rpc',
		'desktop discord rpc app',
		'discord status cycles',
		'discord status images',
		'discord presence buttons',
		'rpc',
		'void presence rpc',
		'dynamic rpc',
		'void presence',
		'void',
	],
	alternates: {
		canonical: '/',
	},
	manifest: '/favicons/manifest.json',
	icons: {
		icon: [
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '16x16',
				url: '/favicons/favicon-16x16.png',
			},
			{
				rel: 'icon',
				url: '/favicon.ico',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '32x32',
				url: '/favicons/favicon-32x32.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '96x96',
				url: '/favicons/favicon-96x96.png',
			},
			{
				rel: 'icon',
				url: '/favicons/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png',
			},
			{
				rel: 'icon',
				url: '/favicons/favicon-16x16.png',
				sizes: '16x16',
				type: 'image/png',
			},
			{
				rel: 'icon',
				url: '/favicons/favicon-32x32.png',
				sizes: '32x32',
				type: 'image/png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '192x192',
				url: '/favicons/android-icon-192x192.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '192x192',
				url: '/favicons/android-icon-192x192.png',
			},
			{
				rel: 'icon',
				type: 'image/x-icon',
				sizes: '32x32',
				url: '/favicons/favicon.ico',
			},
		],
		apple: [
			{
				rel: 'apple-touch-icon',
				sizes: '57x57',
				url: '/favicons/apple-icon-57x57.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '60x60',
				url: '/favicons/apple-icon-60x60.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '72x72',
				url: '/favicons/apple-icon-72x72.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '76x76',
				url: '/favicons/apple-icon-76x76.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '114x114',
				url: '/favicons/apple-icon-114x114.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '120x120',
				url: '/favicons/apple-icon-120x120.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '144x144',
				url: '/favicons/apple-icon-144x144.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '152x152',
				url: '/favicons/apple-icon-152x152.png',
			},
			{
				rel: 'apple-touch-icon',
				sizes: '180x180',
				url: '/favicons/apple-icon-180x180.png',
			},
		],
	},
	openGraph: {
		type: 'website',
		url: siteUrl,
		title: 'Void Presence – Discord Rich Presence Manager',
		siteName: 'Void Presence',
		description:
			'Manage advanced Discord Rich Presence with profiles, buttons, status cycles, and custom images.',
	},
	twitter: {
		card: 'summary_large_image',
		site: '@devollox',
		creator: '@devollox',
		title: 'Void Presence – Discord Rich Presence Manager',
		description:
			'Advanced Discord Rich Presence manager with customizable profiles and status cycles.',
	},
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const session = await auth()

	return (
		<html lang='en'>
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				<NextAuthProvider session={session}>{children}</NextAuthProvider>
				<Analytics />
			</body>
		</html>
	)
}
