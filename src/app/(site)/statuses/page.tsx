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

type AuthorConfigsResponse = {
	user: {
		id: string
		name: string | null
		avatar: string | null
		tag: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
		configs?: {
			presence?: Record<string, boolean>
			status?: Record<string, boolean>
		}
	} | null
	presenceConfigs: any[]
	statusConfigs: { id: string | number }[]
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

async function fetchOwnStatusIds(authorId: string): Promise<string[]> {
	const res = await fetch(
		`${process.env.NEXTAUTH_URL}/api/v1/authors/${encodeURIComponent(authorId)}/configs`,
		{
			method: 'GET',
			cache: 'no-store',
			headers: { 'Content-Type': 'application/json' },
		}
	)

	if (!res.ok) return []

	const data = (await res.json()) as AuthorConfigsResponse
	return (data.statusConfigs || []).map(cfg => String(cfg.id))
}

export default async function StatusPage(props: PageProps) {
	const { q = '' } = await props.searchParams
	const searchTerm = q || ''

	const [initialStatuses, session] = await Promise.all([fetchInitialStatuses(), auth()])

	let initialOwnStatusIds: string[] = []

	if (session?.user?.id) {
		initialOwnStatusIds = await fetchOwnStatusIds(String(session.user.id))
	}

	return (
		<StatusSection
			initialSearchTerm={searchTerm}
			initialStatuses={initialStatuses}
			initialOwnStatusIds={initialOwnStatusIds}
		/>
	)
}
