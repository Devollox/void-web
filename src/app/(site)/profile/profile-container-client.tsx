'use client'

import { db, type Config, type Status } from '@/service/firebase'
import { onValue, ref } from 'firebase/database'
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

		const fetchConfigs = async () => {
			if (cancelled) return
			try {
				const res = await fetch(`/api/v1/authors/${encodeURIComponent(String(userId))}/configs`, {
					method: 'GET',
					cache: 'no-store',
					headers: { 'Content-Type': 'application/json' },
				})
				if (!res.ok) return
				const next = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return
				setConfigs(next.presenceConfigs || [])
				setStatuses(next.statusConfigs || [])
				setLoaded(true)
			} catch {}
		}

		const activityRef = ref(db, 'activity')
		const unsubscribe = onValue(activityRef, snapshot => {
			if (cancelled) return
			const val = snapshot.val() as {
				configs?: { ts: number; kind: string; configId: string; type: string }
				downloads?: { ts: number; kind: string; configId: string; downloads: number }
				profiles?: { ts: number; kind: string; configId?: string }
			} | null

			if (!val) return

			const now = Date.now()

			const configsPing = val.configs
			const downloadsPing = val.downloads
			const profilesPing = val.profiles

			const shouldHandleConfigs =
				configsPing && now - configsPing.ts <= 10000 && !!configsPing.configId
			const shouldHandleDownloads =
				downloadsPing && now - downloadsPing.ts <= 10000 && !!downloadsPing.configId
			const shouldHandleProfiles = profilesPing && now - profilesPing.ts <= 10000

			if (!shouldHandleConfigs && !shouldHandleDownloads && !shouldHandleProfiles) {
				return
			}

			fetchConfigs()
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [userId])

	const lastConfig = useMemo<Config | null>(() => {
		const last = configs.at(-1)
		return last ?? null
	}, [configs])

	return (
		<>
			<ProfileDetailsClient
				authorID={user.id}
				user={user}
				session={session}
				lastConfig={lastConfig}
			/>
			<ProfileConfigsClient initialConfigs={configs} initialStatuses={statuses} loading={!loaded} />
		</>
	)
}
