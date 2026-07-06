'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export function SaveUserOnMount() {
	const { data: session, status } = useSession()
	const user = session?.user as any
	const sentRef = useRef(false)

	useEffect(() => {
		if (status !== 'authenticated') return
		if (!user?.id) return
		if (sentRef.current) return

		sentRef.current = true

		fetch('/api/v1/users/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: String(user.id),
				name: user.name,
				tag: String(user.id).slice(0, 4),
				avatar: user.image,
				provider: user.provider ?? null,
			}),
		}).catch(err => {
			sentRef.current = false
			console.error(err)
		})
	}, [status, user?.id, user?.name, user?.image, user?.provider])

	return null
}
