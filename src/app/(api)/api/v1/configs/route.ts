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

		const [configsSnap, usersSnap] = await Promise.all([
			db.ref(targetRef).get(),
			db.ref('users').get(),
		])

		if (!configsSnap.exists()) {
			return NextResponse.json([], { status: 200 })
		}

		const configsData = configsSnap.val() as Record<string, any>
		const usersData = usersSnap.exists() ? (usersSnap.val() as Record<string, any>) : {}

		const configToOwnerMap: Record<string, any> = {}
		for (const userRaw of Object.values(usersData)) {
			const userConfigs = userRaw?.configs?.[kind] || {}
			for (const [configId, hasConfig] of Object.entries(userConfigs)) {
				if (hasConfig) {
					configToOwnerMap[configId] = userRaw
				}
			}
		}

		if (kind === 'presence') {
			const list: Config[] = Object.entries(configsData).map(([id, raw]) => {
				const r = raw as any
				const user = configToOwnerMap[id]

				return mapRawToConfig(
					id,
					r,
					user?.avatar || user?.image || '',
					user?.name || r?.author || 'Unknown'
				)
			})

			return NextResponse.json(list, { status: 200 })
		}

		const list: Status[] = Object.entries(configsData).map(([id, raw]) => {
			const r = raw as any
			const user = configToOwnerMap[id]

			return mapRawToStatus(
				id,
				r,
				user?.avatar || user?.image || '',
				user?.name || r?.author || 'Unknown'
			)
		})

		return NextResponse.json(list, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalInternalError', message }, { status: 500 })
	}
}
