import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ReleaseListSkeleton from '../release-list-skeleton'
import { ReleasesSection } from './releases-section'

export const metadata: Metadata = {
	title: 'Release Installer',
	description:
		'Release history for the Void Presence installer with version timeline and GitHub release data.',
	openGraph: {
		title: 'Void Presence - Installer Releases',
		description: 'Track Void Presence installer releases and changelog history in one place.',
		url: '/schedule/installer',
	},
}

export default function InstallerPage() {
	return (
		<Page>
			<PageHeader
				title='Void Presence Installer Releases'
				subtitle='Track current and past installer releases and published builds.'
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
