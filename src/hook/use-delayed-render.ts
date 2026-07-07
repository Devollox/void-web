'use client'

import { useEffect, useState } from 'react'

export function useDelayedReady(active: boolean, delayMs: number) {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!active) {
			setReady(false)
			return
		}

		const t = setTimeout(() => setReady(true), delayMs)
		return () => clearTimeout(t)
	}, [active, delayMs])

	return ready
}
