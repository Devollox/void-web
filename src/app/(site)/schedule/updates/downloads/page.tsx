import Footer from '@/components/footer'
import Page from '@/components/page'
import PageHeader from '@/components/page-header'
import { Metadata } from 'next'
import { Suspense } from 'react'
import ReleaseListSkeleton from '../../release-list-skeleton'
import { DownloadsContent } from './downloads-content'

export const metadata: Metadata = {
	title: 'Updates Downloads',
	description:
		'Downloads analytics for all Void Presence update releases, based on GitHub release assets.',
	openGraph: {
		title: 'Void Presence - Updates Downloads',
		description:
			'View download counts for all Void Presence update releases and compare their adoption.',
		url: '/schedule/updates/downloads',
	},
}

export default function PageComponent() {
	return (
		<Page>
			<PageHeader
				title='Void Presence Application Release'
				subtitle='Track current and past releases, prereleases, and published builds.'
			/>
			<Suspense
				fallback={
					<ReleaseListSkeleton countSkeleton={5} backBtn={false} analytics={false} list={true} />
				}
			>
				<DownloadsContent />
			</Suspense>
			<Footer />
		</Page>
	)
}
