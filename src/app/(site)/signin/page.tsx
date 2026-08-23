import type { Metadata } from 'next'
import { SignInPageClient } from './signin-client'

export const metadata: Metadata = {
	title: 'Sign in',
	description:
		'Sign in to Void Presence to manage profiles, status cycles and Discord Rich Presence.',
	openGraph: {
		title: 'Sign in to Void Presence',
		description:
			'Connect your account to manage Discord Rich Presence configs, profiles and status cycles.',
		url: '/signin',
	},
	alternates: {
		canonical: '/signin',
	},
}

export default function Page() {
	return <SignInPageClient />
}
