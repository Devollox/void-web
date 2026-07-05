import { admin } from '@/service/firebase-admin'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

type Params = { authorId: string }

type AddConfigBody = {
	kind: 'presence' | 'status'
	title: string
	description: string
	author: string
	authorId: string
	authorAvatar?: string | null
	configData: any
	downloads: number
	uploadedAt: number
}

type ColorResult = {
	averageColor: string
}

const db = admin.database()

export function buildAuthorTag(authorId: string) {
	const digitsOnly = authorId.replace(/\D/g, '')
	const head = digitsOnly.slice(0, 4)
	return head.padStart(4, '0')
}

function defaultColor(): ColorResult {
	return { averageColor: '#5b5b5b' }
}

function toHex(n: number) {
	return n.toString(16).padStart(2, '0')
}

function rgbToHex(r: number, g: number, b: number) {
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function getColorsFromImage(url: string): Promise<ColorResult> {
	try {
		if (!url) {
			return defaultColor()
		}

		const res = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
			},
		})

		if (!res.ok) {
			return defaultColor()
		}

		const contentType = res.headers.get('content-type') || ''
		if (!contentType.startsWith('image/')) {
			return defaultColor()
		}

		const arrayBuffer = await res.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		const rgbaBuffer = await sharp(buffer)
			.resize(24, 24, { fit: 'fill' })
			.ensureAlpha()
			.raw()
			.toBuffer()

		let r = 0
		let g = 0
		let b = 0
		let count = 0

		for (let i = 0; i < rgbaBuffer.length; i += 4) {
			const alpha = rgbaBuffer[i + 3]
			if (alpha < 128) continue
			r += rgbaBuffer[i]
			g += rgbaBuffer[i + 1]
			b += rgbaBuffer[i + 2]
			count++
		}

		if (!count) {
			return defaultColor()
		}

		r = Math.round(r / count)
		g = Math.round(g / count)
		b = Math.round(b / count)

		const hex = rgbToHex(r, g, b)

		return { averageColor: hex }
	} catch {
		return defaultColor()
	}
}

async function getColorsFromImages(urls: string[]): Promise<string[]> {
	const validUrls = urls.filter(url => typeof url === 'string' && url.trim().length > 0)
	if (!validUrls.length) {
		return []
	}

	const results = await Promise.all(validUrls.map(url => getColorsFromImage(url)))
	return results.map(res => res.averageColor)
}

export async function createPresenceConfig(
	authorId: string,
	body: AddConfigBody,
	averageColors: string[]
): Promise<string> {
	const ref = db.ref('presence-configs').push()
	const { kind, ...rest } = body

	await ref.set({
		...rest,
		authorTag: buildAuthorTag(authorId),
		averageColors,
	})

	const id = ref.key || 'unknown'

	const userConfigsRef = db.ref(`users/${authorId}/configs/presence/${id}`)
	await userConfigsRef.set(true)

	return id
}

export async function createStatusConfig(authorId: string, body: AddConfigBody): Promise<string> {
	const ref = db.ref('status-configs').push()
	const { kind, ...rest } = body

	await ref.set({
		...rest,
		authorTag: buildAuthorTag(authorId),
	})

	const id = ref.key || 'unknown'

	const userConfigsRef = db.ref(`users/${authorId}/configs/status/${id}`)
	await userConfigsRef.set(true)

	return id
}

export async function POST(req: Request, ctx: { params: Promise<Params> | Params }) {
	try {
		const { authorId } = await ctx.params

		if (!authorId) {
			return NextResponse.json(
				{ error: 'MissingAuthorId', message: 'Author id is required in path' },
				{ status: 400 }
			)
		}

		const body = (await req.json()) as AddConfigBody

		if (!body.kind || (body.kind !== 'presence' && body.kind !== 'status')) {
			return NextResponse.json(
				{ error: 'InvalidKind', message: 'kind must be "presence" or "status"' },
				{ status: 400 }
			)
		}

		if (!body.title || !body.configData) {
			return NextResponse.json(
				{ error: 'InvalidPayload', message: 'title and configData are required' },
				{ status: 400 }
			)
		}

		const userSnap = await db.ref(`users/${authorId}`).get()
		if (!userSnap.exists()) {
			return NextResponse.json(
				{ error: 'AuthorNotFound', message: 'Author does not exist' },
				{ status: 404 }
			)
		}

		let averageColors: string[] = []

		if (body.kind === 'presence') {
			const data = body.configData as any
			const imageUrls: string[] = Array.isArray(data?.imageCycles)
				? data.imageCycles
						.map((img: any) => (typeof img?.largeImage === 'string' ? img.largeImage : ''))
						.filter((url: string) => url.length > 0)
				: []

			averageColors = imageUrls.length > 0 ? await getColorsFromImages(imageUrls) : []
		}

		const createdId =
			body.kind === 'presence'
				? await createPresenceConfig(authorId, body, averageColors)
				: await createStatusConfig(authorId, body)

		return NextResponse.json({ id: createdId }, { status: 200 })
	} catch (err) {
		const message = err instanceof Error ? err.message : JSON.stringify(err)
		return NextResponse.json({ error: 'InternalError', message }, { status: 500 })
	}
}
