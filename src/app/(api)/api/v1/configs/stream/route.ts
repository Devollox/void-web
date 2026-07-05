import { auth } from '@/lib/auth'
import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import { Config as BaseConfig, Status as BaseStatus, ConfigKind } from '../route'

const db = admin.database()

type QueryKind = ConfigKind
type Config = BaseConfig & { isOwn?: boolean }
type Status = BaseStatus & { isOwn?: boolean }

type OwnerInfo = {
	uid: string
	user: any
}

function buildConfigToOwnerMap(
	kind: QueryKind,
	users: Record<string, any>
): Record<string, OwnerInfo> {
	const map: Record<string, OwnerInfo> = {}

	for (const [uid, userData] of Object.entries(users)) {
		if (!userData) continue
		const configs = (userData as any).configs || {}
		const kindConfigs = configs[kind] || {}

		for (const [configId, hasConfig] of Object.entries(kindConfigs)) {
			if (!hasConfig) continue
			map[configId] = { uid, user: userData }
		}
	}

	return map
}

async function loadAllByKind(kind: QueryKind, currentUserId?: string | null) {
	const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'

	const [configsSnap, usersSnap] = await Promise.all([
		db.ref(targetRef).get(),
		db.ref('users').get(),
	])

	if (!configsSnap.exists()) return []

	const data = configsSnap.val() as Record<string, any>
	const users = usersSnap.exists() ? (usersSnap.val() as Record<string, any>) : {}

	const configToOwnerMap = buildConfigToOwnerMap(kind, users)

	if (kind === 'presence') {
		const list: Config[] = Object.entries(data).map(([id, raw]) => {
			const r = raw as any
			const ownerData = configToOwnerMap[id]
			const user = ownerData?.user
			const ownerId = ownerData?.uid || null

			const avatar =
				user?.avatar || user?.image || user?.picture || r?.authorAvatar || r?.avatar || ''
			const name =
				user?.name || user?.displayName || user?.username || r?.author || r?.authorName || 'Unknown'
			const tag =
				typeof user?.tag !== 'undefined' && user?.tag !== null
					? String(user.tag).padStart(4, '0')
					: typeof r?.authorTag !== 'undefined' && r?.authorTag !== null
						? String(r.authorTag).padStart(4, '0')
						: undefined

			const cfg = mapRawToConfig(id, r, avatar, name) as Config
			cfg.authorTag = tag

			if (currentUserId && ownerId && currentUserId === ownerId) {
				cfg.isOwn = true
			}

			return cfg
		})

		return list
	}

	const list: Status[] = Object.entries(data).map(([id, raw]) => {
		const r = raw as any
		const ownerData = configToOwnerMap[id]
		const user = ownerData?.user
		const ownerId = ownerData?.uid || null

		const avatar =
			user?.avatar || user?.image || user?.picture || r?.authorAvatar || r?.avatar || ''
		const name =
			user?.name || user?.displayName || user?.username || r?.author || r?.authorName || 'Unknown'
		const tag =
			typeof user?.tag !== 'undefined' && user?.tag !== null
				? String(user.tag).padStart(4, '0')
				: typeof r?.authorTag !== 'undefined' && r?.authorTag !== null
					? String(r.authorTag).padStart(4, '0')
					: undefined

		const st = mapRawToStatus(id, r, avatar, name) as Status
		st.authorTag = tag

		if (currentUserId && ownerId && currentUserId === ownerId) {
			st.isOwn = true
		}

		return st
	})

	return list
}

export async function GET(req: Request) {
	const kind = new URL(req.url).searchParams.get('kind') as QueryKind | null

	if (kind !== 'presence' && kind !== 'status') {
		return NextResponse.json(
			{ error: 'InvalidKind', message: 'kind query param is required' },
			{ status: 400 }
		)
	}

	const session = await auth()
	const currentUserId = session?.user?.id ? String(session.user.id) : null

	const encoder = new TextEncoder()
	let closed = false

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: any) => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
				} catch {}
			}

			const initial = await loadAllByKind(kind, currentUserId)
			send('ready', initial)

			const refPath = kind === 'presence' ? 'presence-configs' : 'status-configs'
			const ref = db.ref(refPath)

			const onValueHandler = async () => {
				if (closed) return
				const next = await loadAllByKind(kind, currentUserId)
				send('update', next)
			}

			ref.on('value', onValueHandler)

			const ping = setInterval(() => {
				if (closed) return
				try {
					controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
				} catch {}
			}, 25000)

			req.signal.addEventListener('abort', () => {
				closed = true
				clearInterval(ping)
				ref.off('value', onValueHandler)
				try {
					controller.close()
				} catch {}
			})
		},
		cancel() {
			closed = true
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'Content-Encoding': 'none',
			'X-Accel-Buffering': 'no',
		},
	})
}
