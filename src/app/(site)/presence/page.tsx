import type { Config } from '@/app/(api)/api/v1/configs/route'
import type { Metadata } from 'next'
import { ConfigsSection } from './presence-section'

type SearchParams = {
	q?: string
}

type PageProps = {
	searchParams: Promise<SearchParams> | SearchParams
}

export const metadata: Metadata = {
	title: 'Presence profiles',
	description:
		'Browse and search shared Void Presence profiles to quickly set up your Discord Rich Presence.',
	openGraph: {
		title: 'Void Presence - Profiles',
		description: 'Discover ready-to-use Void Presence profiles and import them into your setup.',
		url: '/presence',
	},
}

type PresenceConfig = Config

type FetchResponse = {
	items: PresenceConfig[]
	total: number
	offset: number
	limit: number
}

const INITIAL_LIMIT = 12

async function fetchInitialPresence(): Promise<FetchResponse> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/v1/configs`, {
		method: 'POST',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: 'presence', offset: 0, limit: INITIAL_LIMIT }),
	})

	if (!res.ok) {
		return { items: [], total: 0, offset: 0, limit: INITIAL_LIMIT }
	}
	return (await res.json()) as FetchResponse
}

export default async function ConfigsPage(props: PageProps) {
	const { q = '' } = await props.searchParams
	const searchTerm = q || ''

	const initial = await fetchInitialPresence()

	return (
		<ConfigsSection
			initialSearchTerm={searchTerm}
			initialConfigs={initial.items}
			initialTotal={initial.total}
			initialLimit={initial.limit}
		/>
	)
}
