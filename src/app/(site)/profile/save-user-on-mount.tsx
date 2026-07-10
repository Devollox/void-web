'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export function SaveUserOnMount() {
	const { data: session, status } = useSession()
	const user = session?.user as any
	const sentRef = useRef(false)

	function normalizeTag(tag?: string): string | null {
		if (!tag) return null
		const digitsOnly = tag.replace(/\D/g, '')
		const head = digitsOnly.slice(0, 4)
		return head.padStart(4, '0')
	}

	useEffect(() => {
		if (status !== 'authenticated') return
		if (!user?.id) return
		if (sentRef.current) return

		sentRef.current = true

		fetch('/api/auth/users/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: String(user.id),
				name: user.name,
				tag: normalizeTag(user.id),
				avatar: user.image,
				provider: user.provider ?? null,
			}),
		}).catch(() => {
			sentRef.current = false
		})
	}, [status, user?.id, user?.name, user?.image, user?.provider])

	return null
}
