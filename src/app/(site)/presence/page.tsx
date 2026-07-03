import { auth } from '@/lib/auth'
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
		title: 'Void Presence profiles',
		description: 'Discover ready-to-use Void Presence profiles and import them into your setup.',
		url: '/presence',
	},
}

type PresenceConfig = import('@/app/(api)/api/v1/configs/route').Config

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
	presenceConfigs: PresenceConfig[]
	statusConfigs: any[]
}

async function fetchInitialPresence(): Promise<PresenceConfig[]> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/v1/configs`, {
		method: 'POST',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: 'presence' }),
	})

	if (!res.ok) return []
	return (await res.json()) as PresenceConfig[]
}

async function fetchOwnPresenceIds(authorId: string): Promise<string[]> {
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
	return (data.presenceConfigs || []).map(cfg => String(cfg.id))
}

export default async function ConfigsPage(props: PageProps) {
	const { q = '' } = await props.searchParams
	const searchTerm = q || ''

	const [initialConfigs, session] = await Promise.all([fetchInitialPresence(), auth()])

	let initialOwnConfigIds: string[] = []

	if (session?.user?.id) {
		initialOwnConfigIds = await fetchOwnPresenceIds(String(session.user.id))
	}

	return (
		<ConfigsSection
			initialSearchTerm={searchTerm}
			initialConfigs={initialConfigs}
			initialOwnConfigIds={initialOwnConfigIds}
		/>
	)
}
