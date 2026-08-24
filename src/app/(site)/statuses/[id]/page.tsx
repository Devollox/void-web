import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Metadata } from 'next'
import { StatusDetailsClient } from './details-client'

type Params = {
	id: string
}

type Props = {
	params: Promise<Params> | Params
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { id } = await props.params

	return {
		title: 'Status details',
		description: 'Inspect and use a community Void Presence Discord custom status preset.',
		openGraph: {
			title: 'Void Presence - Status details',
			description: 'Inspect and use a community Void Presence Discord custom status preset.',
			url: `/status/${id}`,
		},
		alternates: {
			canonical: '/status/${id}',
		},
	}
}

export default async function StatusDetailsPage(props: Props) {
	const { id } = await props.params
	const previewTick = 0

	return (
		<Page>
			<PageHeader
				title='Pick a Status!'
				subtitle='Browse community custom Discord status presets'
			/>
			<StatusDetailsClient statusId={id} initialPreviewTick={previewTick} />
		</Page>
	)
}
