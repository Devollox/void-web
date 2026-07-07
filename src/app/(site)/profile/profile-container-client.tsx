'use client'

import type { Config, Status } from '@/service/firebase'
import type { Session } from 'next-auth'
import { useEffect, useMemo, useState } from 'react'
import { ProfileConfigsClient } from './profile-configs-client'
import { ProfileDetailsClient } from './profile-details-client'

type Props = {
	initialConfigs: Config[]
	initialStatuses: Status[]
	user: any
	session: Session
	userId: string
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
	presenceConfigs: Config[]
	statusConfigs: Status[]
}

export function ProfileContainerClient({
	initialConfigs,
	initialStatuses,
	user,
	session,
	userId,
}: Props) {
	const [configs, setConfigs] = useState<Config[]>(initialConfigs)
	const [statuses, setStatuses] = useState<Status[]>(initialStatuses)
	const [loaded, setLoaded] = useState(initialConfigs.length > 0 || initialStatuses.length > 0)

	useEffect(() => {
		let cancelled = false
		const eventSource = new EventSource(
			`/api/v1/authors/${encodeURIComponent(String(userId))}/stream`
		)

		const handleUpdate = async () => {
			if (cancelled) return
			try {
				const res = await fetch(`/api/v1/authors/${encodeURIComponent(String(userId))}/configs`)
				if (!res.ok) return
				const next = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return
				setConfigs(next.presenceConfigs || [])
				setStatuses(next.statusConfigs || [])
				setLoaded(true)
			} catch {}
		}

		eventSource.addEventListener('profile-update', handleUpdate)
		eventSource.addEventListener('update', handleUpdate)
		eventSource.addEventListener('created', handleUpdate)
		eventSource.addEventListener('deleted', handleUpdate)
		eventSource.addEventListener('downloads', handleUpdate)

		eventSource.onerror = () => {}

		return () => {
			cancelled = true
			eventSource.close()
		}
	}, [userId])

	const lastConfig = useMemo(() => (configs.length ? configs[configs.length - 1] : null), [configs])

	return (
		<>
			<ProfileDetailsClient
				authorID={user.id}
				user={user}
				session={session}
				lastConfig={lastConfig}
			/>
			<ProfileConfigsClient userId={userId} initialConfigs={configs} initialStatuses={statuses} />
		</>
	)
}
