import { getApps, initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
	databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL as string,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string,
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getDatabase(app, firebaseConfig.databaseURL)

export interface ConfigData {
	cycles: Array<{ details: string; state: string }>
	imageCycles: Array<{
		largeImage: string
		largeText?: string
		smallImage?: string
		smallText?: string
	}>
	buttonPairs: Array<{ label1: string; url1: string; label2?: string; url2?: string }>
}

export interface UserRecord {
	name?: string
	createdAt?: number
	avatar?: string
	image?: string
	provider?: string | null
	lastSeen?: number
}

export interface BasicConfig {
	id: string
	title: string
	author: string
	authorAvatar?: string | null
	authorTag?: string
	downloads: number
	description: string
	uploadedAt?: number
}

export interface Config extends BasicConfig {
	configData: ConfigData
	averageColor?: string
	averageColors?: string[]
}

export interface Status extends BasicConfig {
	configData: {
		statusCycles: ConfigData['cycles']
	}
}

export interface Plugin extends BasicConfig {
	version: string
	sourceUrl: string
	tags?: string[]
	preview?: {
		details?: string
		state?: string
		activityType?: string
		slides?: string[]
	}
}

export interface AuthorConfigsResponse {
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

export interface UserData {
	id: string
	name?: string
	avatar?: string
	image?: string
}

export interface Stats {
	visitors: { count: number; lastUpdated: number }
	downloads: { count: number; lastUpdated: number }
}

function asRecord(raw: unknown): Record<string, unknown> {
	if (typeof raw === 'object' && raw !== null) {
		return raw as Record<string, unknown>
	}
	return {}
}

function mapRawToBasicConfig(
	id: string,
	raw: unknown,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): BasicConfig {
	const rawData = asRecord(raw)

	return {
		id,
		title: typeof rawData.title === 'string' ? rawData.title.trim() : 'Unnamed',
		author:
			overriddenAuthor || (typeof rawData.author === 'string' ? rawData.author.trim() : 'Unknown'),
		authorAvatar:
			overriddenAvatar ??
			(typeof rawData.authorAvatar === 'string' ? rawData.authorAvatar : undefined),
		authorTag: typeof rawData.authorTag === 'string' ? rawData.authorTag : undefined,
		downloads:
			typeof rawData.downloads === 'number' ? rawData.downloads : Number(rawData.downloads) || 0,
		description: typeof rawData.description === 'string' ? rawData.description.trim() : '',
		uploadedAt: Number(rawData.uploadedAt) || 0,
	}
}

export function mapRawToConfig(
	id: string,
	raw: unknown,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Config {
	const rawData = asRecord(raw)

	const cfg: Config = {
		...mapRawToBasicConfig(id, raw, overriddenAvatar, overriddenAuthor),
		configData: (rawData.configData as ConfigData) ?? {
			cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
			imageCycles: [],
			buttonPairs: [],
		},
	}

	if (Array.isArray(rawData.averageColors)) {
		cfg.averageColors = rawData.averageColors as string[]
	}

	return cfg
}

export function mapRawToStatus(
	id: string,
	raw: unknown,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Status {
	const rawData = asRecord(raw)
	const configData = rawData.configData as { statusCycles?: unknown } | undefined

	return {
		...mapRawToBasicConfig(id, raw, overriddenAvatar, overriddenAuthor),
		configData: {
			statusCycles: Array.isArray(configData?.statusCycles)
				? (configData.statusCycles as ConfigData['cycles'])
				: [],
		},
	}
}

export function mapRawToPlugin(id: string, raw: unknown): Plugin {
	const rawData = asRecord(raw)

	return {
		...mapRawToBasicConfig(id, raw),
		version: typeof rawData.version === 'string' ? rawData.version : '1.0.0',
		sourceUrl: typeof rawData.sourceUrl === 'string' ? rawData.sourceUrl : '',
		tags: Array.isArray(rawData.tags) ? (rawData.tags as string[]) : [],
		preview: (rawData.preview as Plugin['preview']) ?? {},
	}
}

export function mapRawToStats(raw: unknown): Stats {
	const rawData = asRecord(raw)

	return {
		visitors: (rawData.visitors as Stats['visitors']) ?? { count: 0, lastUpdated: Date.now() },
		downloads: (rawData.downloads as Stats['downloads']) ?? { count: 0, lastUpdated: Date.now() },
	}
}
