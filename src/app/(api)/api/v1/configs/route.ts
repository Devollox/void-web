import { mapRawToConfig, mapRawToStatus } from '@/service/firebase'
import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'

const db = admin.database()

export type ConfigKind = 'presence' | 'status'

export interface ButtonPair {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

export interface ConfigData {
	cycles: Array<{ details: string; state: string }>
	imageCycles: Array<{
		largeImage: string
		largeText?: string
		smallImage?: string
		smallText?: string
	}>
	buttonPairs: ButtonPair[]
}

export interface Config {
	id: string
	title: string
	author: string
	authorAvatar?: string
	authorTag?: string
	downloads: number
	description: string
	configData: ConfigData
	averageColors?: string[]
	uploadedAt?: number
}

export interface Status {
	id: string
	title: string
	author: string
	authorAvatar?: string
	authorTag?: string
	downloads: number
	description: string
	configData: {
		statusCycles: Array<{ text: string }>
	}
	uploadedAt?: number
}

type GetAllPayload = {
	kind: ConfigKind
}

const usersCache: Record<string, { data: any; updatedAt: number }> = {}
const CACHE_TTL = 30000

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as GetAllPayload

		if (!body || !body.kind) {
			return NextResponse.json(
				{ error: 'InvalidPayload', message: 'kind is required' },
				{ status: 400 }
			)
		}

		const { kind } = body

		if (kind !== 'presence' && kind !== 'status') {
			return NextResponse.json(
				{ error: 'InvalidKind', message: `Unsupported kind: ${kind}` },
				{ status: 400 }
			)
		}

		const targetRef = kind === 'presence' ? 'presence-configs' : 'status-configs'

		const configsSnap = await db.ref(targetRef).get()

		if (!configsSnap.exists()) {
			return NextResponse.json([], { status: 200 })
		}

		const configsData = configsSnap.val() as Record<string, any>
		const configEntries = Object.entries(configsData)

		const now = Date.now()
		const missingAuthorIds = new Set<string>()

		for (const [, raw] of configEntries) {
			if (raw?.authorId) {
				const uid = String(raw.authorId)
				if (!usersCache[uid] || now - usersCache[uid].updatedAt > CACHE_TTL) {
					missingAuthorIds.add(uid)
				}
			}
		}

		if (missingAuthorIds.size > 0) {
			if (missingAuthorIds.size > 5) {
				const allUsersSnap = await db.ref('users').get()
				if (allUsersSnap.exists()) {
					const allUsers = allUsersSnap.val() as Record<string, any>
					for (const uid of missingAuthorIds) {
						if (allUsers[uid]) {
							usersCache[uid] = { data: allUsers[uid], updatedAt: now }
						}
					}
				}
			} else {
				await Promise.all(
					Array.from(missingAuthorIds).map(async uid => {
						const userSnap = await db.ref(`users/${uid}`).get()
						if (userSnap.exists()) {
							usersCache[uid] = { data: userSnap.val(), updatedAt: now }
						}
					})
				)
			}
		}

		const list = configEntries.map(([id, raw]) => {
			const r = raw as any
			const authorId = r.authorId ? String(r.authorId) : null
			const user = authorId ? usersCache[authorId]?.data : null

			const avatar = user?.avatar || user?.image || r?.authorAvatar || '/logo.png'
			const name = user?.name || r?.author || 'Unknown User'
			const tag =
				typeof user?.tag !== 'undefined'
					? String(user.tag).padStart(4, '0')
					: r?.authorTag || undefined

			if (kind === 'presence') {
				const cfg = mapRawToConfig(id, r, avatar, name) as Config
				cfg.authorTag = tag
				return cfg
			} else {
				const st = mapRawToStatus(id, r, avatar, name) as Status
				st.authorTag = tag
				return st
			}
		})

		return NextResponse.json(list, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
