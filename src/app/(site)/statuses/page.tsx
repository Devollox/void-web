import { auth } from '@/lib/auth'
import type { Status } from '@service/firebase'
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
		title: 'Void Presence Statuses',
		description: 'Discover ready-to-use Void Presence statuses and import them into your setup.',
		url: '/statuses',
	},
}

async function fetchInitialStatuses(): Promise<Status[]> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/v1/configs`, {
		method: 'POST',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: 'status' }),
	})

	if (!res.ok) return []
	return (await res.json()) as Status[]
}

export default async function StatusPage(props: PageProps) {
	const { q = '' } = await props.searchParams
	const searchTerm = q || ''

	const [initialStatuses] = await Promise.all([fetchInitialStatuses(), auth()])

	return <StatusSection initialSearchTerm={searchTerm} initialStatuses={initialStatuses} />
}
