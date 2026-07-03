import { leftNotFound, rightNotFound } from '@/app/not-found'
import { auth } from '@/lib/auth'
import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import { default as styles } from '../../download/download.module.scss'
import { ProfileClient } from './profile-client'

type Props = {
	params: Promise<{ id: string }>
	searchParams: Promise<{ tag?: string }>
}

type AuthorConfigsResponse = {
	user: {
		id?: string
		name: string | null
		avatar: string | null
		tag: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: any[]
	statusConfigs: any[]
}

async function fetchAuthorConfigsByHandle(
	username: string,
	tag: string
): Promise<AuthorConfigsResponse | null> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/v1/authors/resolve`, {
		method: 'POST',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, tag }),
	})

	if (!res.ok) return null
	return (await res.json()) as AuthorConfigsResponse
}

type AuthorOwnConfigsResponse = {
	user: {
		id: string
	} | null
	presenceConfigs: { id: string | number }[]
	statusConfigs: { id: string | number }[]
}

async function fetchOwnIds(authorId: string): Promise<{
	presenceIds: string[]
	statusIds: string[]
}> {
	const res = await fetch(
		`${process.env.NEXTAUTH_URL}/api/v1/authors/${encodeURIComponent(authorId)}/configs`,
		{
			method: 'GET',
			cache: 'no-store',
			headers: { 'Content-Type': 'application/json' },
		}
	)

	if (!res.ok) return { presenceIds: [], statusIds: [] }

	const data = (await res.json()) as AuthorOwnConfigsResponse

	return {
		presenceIds: (data.presenceConfigs || []).map(cfg => String(cfg.id)),
		statusIds: (data.statusConfigs || []).map(cfg => String(cfg.id)),
	}
}

export default async function ProfilePage(props: Props) {
	const { id } = await props.params
	const { tag } = await props.searchParams

	const username = decodeURIComponent(id)
	const normalizedTag = String(tag ?? '').padStart(4, '0')

	const [data, session] = await Promise.all([
		fetchAuthorConfigsByHandle(username, normalizedTag),
		auth(),
	])

	if (!data?.user) {
		return (
			<Page>
				<PageHeader title='User Profile' subtitle='User not found' />
				<PanelLayout
					left={leftNotFound({ text: 'Go to configs page', url: '/configs' })}
					right={rightNotFound}
					className={styles.not_found_panel}
				/>
				<Footer />
			</Page>
		)
	}

	const { user, presenceConfigs, statusConfigs } = data

	let initialOwnPresenceIds: string[] = []
	let initialOwnStatusIds: string[] = []

	const isOwnerServer =
		!!session?.user?.id &&
		!!user.name &&
		!!user.tag &&
		session.user.name === user.name &&
		session.user.id.startsWith(normalizedTag)

	if (isOwnerServer && session?.user?.id) {
		const own = await fetchOwnIds(String(session.user.id))
		initialOwnPresenceIds = own.presenceIds
		initialOwnStatusIds = own.statusIds
	}

	return (
		<Page>
			<PageHeader
				title='User Profile'
				subtitle={`User configs from ${user.name}#${user.tag ?? '0000'}`}
			/>
			<ProfileClient
				user={user}
				presenceConfigs={presenceConfigs as any}
				statusConfigs={statusConfigs as any}
				profileTag={normalizedTag}
				username={username}
				initialOwnPresenceIds={initialOwnPresenceIds}
				initialOwnStatusIds={initialOwnStatusIds}
			/>
			<Footer />
		</Page>
	)
}
