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

export interface UserRecord {
	name?: string
	createdAt?: number
	avatar?: string
	image?: string
	provider?: string | null
	lastSeen?: number
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
	averageColor?: string
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

export interface Plugin {
	id: string
	title: string
	description: string
	author: string
	authorAvatar?: string
	authorTag?: string
	version: string
	downloads: number
	sourceUrl: string
	tags?: string[]
	preview?: {
		details?: string
		state?: string
		activityType?: string
	}
	uploadedAt?: number
}

export interface UserRecordWithId extends UserRecord {
	id: string
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

export function mapRawToConfig(
	id: string,
	data: any,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Config {
	const cfg: Config = {
		id,
		title: data?.title || 'Unnamed',
		author: overriddenAuthor || data?.author || 'Unknown',
		authorAvatar: overriddenAvatar || '',
		authorTag: data?.authorTag || undefined,
		downloads:
			typeof data?.downloads === 'number'
				? data.downloads
				: parseInt(String(data?.downloads ?? '0')) || 0,
		description: data?.description || '',
		configData: data?.configData || {
			cycles: [{ details: 'Idling in the void', state: 'Just vibing' }],
			imageCycles: [],
			buttonPairs: [],
		},
		uploadedAt: data?.uploadedAt || 0,
	}

	if (Array.isArray(data?.averageColors)) {
		cfg.averageColors = data.averageColors as string[]
	}

	return cfg
}

export function mapRawToStatus(
	id: string,
	data: any,
	overriddenAvatar?: string,
	overriddenAuthor?: string
): Status {
	return {
		id,
		title: data?.title || 'Unnamed',
		author: overriddenAuthor || data?.author || 'Unknown',
		authorAvatar: overriddenAvatar || '',
		authorTag: data?.authorTag || undefined,
		downloads:
			typeof data?.downloads === 'number'
				? data.downloads
				: parseInt(String(data?.downloads ?? '0')) || 0,
		description: data?.description || '',
		configData: data?.configData || { statusCycles: [] },
		uploadedAt: data?.uploadedAt || 0,
	}
}

export function mapRawToPlugin(id: string, data: any): Plugin {
	return {
		id,
		title: data?.title || 'Unnamed Plugin',
		description: data?.description || '',
		author: data?.author || 'Unknown',
		authorAvatar: data?.authorAvatar || '',
		authorTag: data?.authorTag || undefined,
		version: data?.version || '1.0.0',
		downloads:
			typeof data?.downloads === 'number'
				? data.downloads
				: parseInt(String(data?.downloads ?? '0')) || 0,
		sourceUrl: data?.sourceUrl || '',
		tags: Array.isArray(data?.tags) ? data.tags : [],
		preview: data?.preview || {},
		uploadedAt: data?.uploadedAt || 0,
	}
}

export function mapRawToStats(raw: any): Stats {
	return {
		visitors: raw?.visitors || { count: 0, lastUpdated: Date.now() },
		downloads: raw?.downloads || { count: 0, lastUpdated: Date.now() },
	}
}
