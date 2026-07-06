import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ReleaseListSkeleton from '../release-list-skeleton'
import { ReleasesSection } from './releases-section'

export const metadata: Metadata = {
	title: 'Release Application',
	description:
		'Release Application and history for Void Presence with version timeline and GitHub release data.',
	openGraph: {
		title: 'Void Presence - Application Release',
		description: 'Track Void Presence releases, prereleases, and changelog history in one place.',
		url: '/schedule/application',
	},
}

export default function ApplicationPage() {
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
				<ReleasesSection />
			</Suspense>
			<Footer />
		</Page>
	)
}
