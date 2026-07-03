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
	averageColor: string
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

export async function fetchAllUsers(): Promise<Record<string, any>> {
	const snap = await db.ref('users').get()
	if (!snap.exists()) return {}
	return snap.val() as Record<string, any>
}

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
		const users = await fetchAllUsers()

		if (kind === 'presence') {
			const snap = await db.ref('presence-configs').get()
			if (!snap.exists()) return NextResponse.json([], { status: 200 })

			const data = snap.val() as Record<string, any>

			const list: Config[] = Object.entries(data).map(([id, raw]) => {
				const r = raw as any

				let user: any = null

				for (const [, userData] of Object.entries(users)) {
					const configs = (userData as any).configs || {}
					if (configs.presence && configs.presence[id]) {
						user = userData
						break
					}
				}

				return mapRawToConfig(
					id,
					r,
					user?.avatar || user?.image || '',
					user?.name || r?.author || 'Unknown'
				)
			})

			return NextResponse.json(list, { status: 200 })
		}

		if (kind === 'status') {
			const snap = await db.ref('status-configs').get()
			if (!snap.exists()) return NextResponse.json([], { status: 200 })

			const data = snap.val() as Record<string, any>

			const list: Status[] = Object.entries(data).map(([id, raw]) => {
				const r = raw as any

				let user: any = null

				for (const [, userData] of Object.entries(users)) {
					const configs = (userData as any).configs || {}
					if (configs.status && configs.status[id]) {
						user = userData
						break
					}
				}

				return mapRawToStatus(
					id,
					r,
					user?.avatar || user?.image || '',
					user?.name || r?.author || 'Unknown'
				)
			})

			return NextResponse.json(list, { status: 200 })
		}

		return NextResponse.json(
			{ error: 'InvalidKind', message: `Unsupported kind: ${kind}` },
			{ status: 400 }
		)
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalInternalError', message }, { status: 500 })
	}
}
