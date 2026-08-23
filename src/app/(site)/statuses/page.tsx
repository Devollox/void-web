import type { Status } from '@/services/firebase'
import type { Metadata } from 'next'
import { StatusSection } from './statuses-section'

type SearchParams = {
	q?: string
}

type PageProps = {
	searchParams: Promise<SearchParams> | SearchParams
}

export const metadata: Metadata = {
	title: 'Statuses',
	description: 'Browse and search shared Void Presence statuses.',
	openGraph: {
		title: 'Void Presence - Statuses',
		description: 'Discover ready-to-use Void Presence statuses and import them into your setup.',
		url: '/statuses',
	},
	alternates: {
		canonical: '/statuses',
	},
}

type FetchResponse = {
	items: Status[]
	total: number
	offset: number
	limit: number
}

const INITIAL_LIMIT = 12

async function fetchInitialStatuses(): Promise<FetchResponse> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/v1/configs`, {
		method: 'POST',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: 'status', offset: 0, limit: INITIAL_LIMIT }),
	})

	if (!res.ok) {
		return { items: [], total: 0, offset: 0, limit: INITIAL_LIMIT }
	}
	return (await res.json()) as FetchResponse
}

export default async function StatusPage(props: PageProps) {
	const { q = '' } = await props.searchParams
	const searchTerm = q || ''

	const initial = await fetchInitialStatuses()

	return (
		<StatusSection
			initialSearchTerm={searchTerm}
			initialStatuses={initial.items}
			initialTotal={initial.total}
			initialLimit={initial.limit}
		/>
	)
}
