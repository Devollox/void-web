'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export function SaveUserOnMount() {
	const { data: session, status } = useSession()
	const user = session?.user as any
	const token = (session as any)?.firebaseToken
	const sentRef = useRef(false)

	useEffect(() => {
		if (status !== 'authenticated') return
		if (!user?.id || !token) return
		if (sentRef.current) return

		sentRef.current = true

		fetch('https://voidpresence.site', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				userId: String(user.id),
				name: user.name,
				tag: String(user.id).slice(0, 4),
				avatar: user.image,
				provider: user.provider ?? null,
			}),
		}).catch(err => {
			setTimeout(() => {
				sentRef.current = false
			}, 5000)
			console.error(err)
		})
	}, [status, user?.id, token])

	return null
}
