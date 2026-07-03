import * as firebaseAdminModule from 'firebase-admin'

const firebaseAdmin = (firebaseAdminModule as any).default || firebaseAdminModule
const admin = firebaseAdmin

if (!admin.apps || admin.apps.length === 0) {
	try {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId: process.env.FIREBASE_PROJECT_ID,
				clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
				privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
			}),
			databaseURL: process.env.FIREBASE_DATABASE_URL,
		})
	} catch (error) {
		console.error('Failed to initialize firebase-admin', error)
	}
}

export { admin }

const db = admin.database()

export async function incrementDownloadsConfigs(configId: string): Promise<number> {
	const ref = db.ref(`presence-configs/${configId}/downloads`)
	const result = await ref.transaction((current: unknown) => (Number(current) || 0) + 1)
	const newVal = result.snapshot?.val()
	return typeof newVal === 'number' ? newVal : Number(newVal) || 0
}

export async function incrementDownloadsStatuses(statusId: string): Promise<number> {
	const ref = db.ref(`status-configs/${statusId}/downloads`)
	const result = await ref.transaction((current: unknown) => (Number(current) || 0) + 1)
	const newVal = result.snapshot?.val()
	return typeof newVal === 'number' ? newVal : Number(newVal) || 0
}

export async function incrementVisitorsStats(): Promise<{ count: number; lastUpdated: number }> {
	const countRef = db.ref('stats/visitors/count')
	const lastUpdatedRef = db.ref('stats/visitors/lastUpdated')

	const txResult = await countRef.transaction((count: unknown) => (Number(count) || 0) + 1)
	const newCountRaw = txResult.snapshot?.val()
	const newCount = typeof newCountRaw === 'number' ? newCountRaw : Number(newCountRaw) || 0

	const now = Date.now()
	await lastUpdatedRef.set(now)

	return { count: newCount, lastUpdated: now }
}

export async function incrementDownloadsStats(): Promise<{ count: number; lastUpdated: number }> {
	const countRef = db.ref('stats/downloads/count')
	const lastUpdatedRef = db.ref('stats/downloads/lastUpdated')

	const txResult = await countRef.transaction((count: unknown) => (Number(count) || 0) + 1)
	const newCountRaw = txResult.snapshot?.val()
	const newCount = typeof newCountRaw === 'number' ? newCountRaw : Number(newCountRaw) || 0

	const now = Date.now()
	await lastUpdatedRef.set(now)

	return { count: newCount, lastUpdated: now }
}
