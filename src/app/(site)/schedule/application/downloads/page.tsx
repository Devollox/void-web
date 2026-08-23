import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ReleaseListSkeleton from '../../release-list-skeleton'
import { DownloadsContent } from './downloads-content'

export const metadata: Metadata = {
	title: 'Application Downloads Analytics',
	description:
		'Downloads analytics for all Void Presence application releases, based on GitHub release assets.',
	openGraph: {
		title: 'Void Presence - Application Downloads',
		description:
			'View download counts for all Void Presence application releases and compare their adoption.',
		url: '/schedule/application/downloads',
	},
	alternates: {
		canonical: '/schedule/application/downloads',
	},
}

export default function DownloadsPage() {
	return (
		<Page>
			<PageHeader
				title='Void Presence Application Downloads'
				subtitle='Downloads analytics for all application releases, loaded from GitHub release assets.'
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
