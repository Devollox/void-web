'use client'

import { UseFirebaseAuth } from '@/hooks/use-firebase-auth'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export function NextAuthProvider({
	children,
	session,
}: {
	children: ReactNode
	session?: Session | null
}) {
	return (
		<SessionProvider session={session}>
			<UseFirebaseAuth />
			{children}
		</SessionProvider>
	)
}
