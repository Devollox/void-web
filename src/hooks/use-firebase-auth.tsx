'use client'

import { app } from '@/services/firebase'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function UseFirebaseAuth() {
	const { data: session } = useSession()

	useEffect(() => {
		const firebaseToken = (session as any)?.firebaseToken as string | undefined
		if (!firebaseToken) return

		const auth = getAuth(app)

		if (auth.currentUser) {
			return
		}

		signInWithCustomToken(auth, firebaseToken).catch()
	}, [session])

	return null
}
