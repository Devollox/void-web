import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ReleaseListSkeleton from '../../release-list-skeleton'
import { DownloadsContent } from './downloads-content'

export const metadata: Metadata = {
	title: 'Installer Downloads Analytics',
	description:
		'Downloads analytics for all Void Presence installer releases, based on GitHub release assets.',
	openGraph: {
		title: 'Void Presence - Installer Downloads',
		description:
			'View download counts for all Void Presence installer releases and compare their adoption.',
		url: '/schedule/installer/downloads',
	},
	alternates: {
		canonical: '/schedule/installer/downloads',
	},
}

export default function DownloadsPage() {
	return (
		<Page>
			<PageHeader
				title='Void Presence Installer Downloads'
				subtitle='Downloads analytics for all installer releases, loaded from GitHub release assets.'
			/>
			<Suspense
				fallback={<ReleaseListSkeleton countSkeleton={0} backBtn={true} analytics={true} />}
			>
				<DownloadsContent />
			</Suspense>
			<Footer />
		</Page>
	)
}
