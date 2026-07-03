import { auth } from '@api/auth/[...nextauth]/route'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { Metadata } from 'next'
import { ProfileContainerClient } from './profile-container-client'
import styles from './profile-details.module.scss'
import { SaveUserOnMount } from './save-user-on-mount'

export const metadata: Metadata = {
	title: 'Your profile',
	description:
		'View your Void Presence profile, session details, and all configs linked to your Author ID.',
	openGraph: {
		title: 'Void Presence – Profile',
		description:
			'Manage your Discord Rich Presence configs, view your Author ID, and access your saved profiles.',
		url: '/profile',
	},
}

type AuthorConfigsResponse = {
	user: {
		id: string
		name: string | null
		avatar: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: any[]
	statusConfigs: any[]
}

async function fetchSelfConfigs(userId: string): Promise<AuthorConfigsResponse | null> {
	if (!userId) return null

	const res = await fetch(
		`${process.env.NEXTAUTH_URL}/api/v1/authors/${encodeURIComponent(userId)}/configs`,
		{
			method: 'GET',
			cache: 'no-store',
			headers: { 'Content-Type': 'application/json' },
		}
	)

	if (!res.ok) return null
	return (await res.json()) as AuthorConfigsResponse
}

export default async function ProfilePage() {
	const session = await auth()

	if (!session || !session.user) {
		return (
			<Page>
				<PageHeader title='Not signed in' subtitle='You need to sign in to view your profile.' />
				<section id='addon-details' className={styles.page_section}>
					<div className={styles.theme_view_panel}>
						<div className={styles.skel_backdrop} />
						<div>
							<div className={styles.addon_splitview_container}>
								<div className={styles.addon_details_right_column}>
									<div className={styles.addon_details_segment}>
										<div className={styles.skel_title} />
										<div className={styles.skel_line} />
										<section className={styles.addon_actions}>
											<div className={styles.btn_container}>
												<div className={styles.skel_button} />
											</div>
										</section>
										<section className={styles.about_addon}>
											<div className={styles.skel_line} />
											<div className={styles.skel_line_short} />
										</section>
									</div>
								</div>

								<div className={styles.addon_details_middle_column}>
									<div className={styles.rpc_card_preview}>
										<div className={styles.skel_rpc} />
									</div>
								</div>

								<div className={styles.addon_details_middle_column}>
									<div className={styles.actions_panel}>
										<div className={styles.skel_actions_title} />
										<div className={styles.skel_actions_subtitle} />
										<div className={styles.actions_buttons}>
											<div className={styles.skel_action_btn} />
											<div className={styles.skel_action_btn} />
											<div className={styles.skel_action_btn} />
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</Page>
		)
	}

	const user = session.user as any
	const userId = String(user.id ?? '')

	const configsData = await fetchSelfConfigs(userId)

	return (
		<Page>
			<PageHeader title='Your profile' subtitle='Session data and your configs.' />

			<SaveUserOnMount />

			<ProfileContainerClient
				initialConfigs={configsData?.presenceConfigs ?? []}
				initialStatuses={configsData?.statusConfigs ?? []}
				user={user}
				session={session}
				userId={userId}
			/>
		</Page>
	)
}
