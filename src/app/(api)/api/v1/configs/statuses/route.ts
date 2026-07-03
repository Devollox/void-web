import { db } from '@/service/firebase'
import { get, ref } from 'firebase/database'
import { NextResponse } from 'next/server'

export async function GET() {
	const cfgsRef = ref(db, 'status-configs')
	const snapshot = await get(cfgsRef)

	if (!snapshot.exists()) {
		return NextResponse.json([], { status: 200 })
	}

	const rawData = snapshot.val()
	const userRef = ref(db, 'users')
	const userSnapshot = await get(userRef)
	const usersCache = userSnapshot.exists() ? userSnapshot.val() : {}

	const list = Object.entries(rawData).map(([id, data]: [string, any]) => {
		const user = data.authorId ? usersCache[data.authorId] : null
		return {
			id,
			title: data?.title || 'Unnamed',
			author: user?.name || data?.author || 'Unknown',
			authorAvatar: user?.avatar || user?.image || data?.authorAvatar || '',
			downloads:
				typeof data?.downloads === 'number'
					? data.downloads
					: parseInt(String(data?.downloads ?? '0')) || 0,
			description: data?.description || '',
			configData: data?.configData || { statusCycles: [] },
		}
	})

	return NextResponse.json(list, { status: 200 })
}
