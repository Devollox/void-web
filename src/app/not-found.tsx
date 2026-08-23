import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import {
	default as downloadStyles,
	default as styles,
} from './(site)/download/download.module.scss'

export const metadata: Metadata = {
	title: 'Page not found',
	description: 'The page you requested does not exist or is no longer available.',
	openGraph: {
		title: 'Void Presence – Page not found',
		description: 'The page you requested does not exist or is no longer available.',
		url: '/not-found',
	},
	alternates: {
		canonical: '/not-found',
	},
}

export const leftNotFound = ({ text, url }: { text: string; url: string }) => (
	<a href={url} className={downloadStyles.download_btn_primary}>
		<span className={downloadStyles.asset_action_text}>{text}</span>
	</a>
)

export const rightNotFound = (
	<section
		style={{
			padding: 0,
			width: '100%',
			display: 'flex',
		}}
	>
		<div
			style={{
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					width: '100%',
					borderRadius: 16,
					background: '#1a1a1ae6',
					border: '1px solid #ffffff0f',
					boxShadow: '0 18px 45px rgba(0,0,0,0.8)',
					padding: 20,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 10,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 16,
							fontWeight: 600,
							color: '#e5e7eb',
						}}
					>
						Nothing to see here
					</h3>
				</div>

				<div
					style={{
						borderRadius: 16,
						minHeight: 220,
						padding: 28,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<p
						style={{
							margin: 0,
							maxWidth: 420,
							fontSize: 13,
							lineHeight: 1.6,
							color: 'rgba(226,232,240,0.8)',
						}}
					>
						The content you were looking for might have been moved, renamed, or deleted. Try going
						back to the homepage or checking the downloads and docs sections.
					</p>
				</div>
			</div>
		</div>
	</section>
)

export default async function NotFound() {
	const headersList = await headers()
	const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? ''

	const isApiHost = host.startsWith('api.')

	const left = isApiHost
		? leftNotFound({ text: 'Go to API page', url: '/' })
		: leftNotFound({ text: 'Go to download page', url: '/download' })

	return (
		<Page>
			<PageHeader
				title='Page not found'
				subtitle='The page you requested does not exist or is no longer available.'
			/>

			<PanelLayout left={left} right={rightNotFound} className={styles.not_found_panel} />
			<Footer />
		</Page>
	)
}
