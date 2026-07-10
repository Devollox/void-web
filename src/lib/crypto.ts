import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = process.env.ENCRYPTION_KEY

if (!SECRET_KEY || SECRET_KEY.length !== 32) {
	throw new Error('CRITICAL: ENCRYPTION_KEY must be exactly 32 characters.')
}

const ENCRYPTION_BUFFER = Buffer.from(SECRET_KEY)

export function encryptUserId(userId: string): string {
	const iv = crypto.randomBytes(12)
	const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_BUFFER, iv)
	let encrypted = cipher.update(userId, 'utf8', 'hex')
	encrypted += cipher.final('hex')
	const authTag = cipher.getAuthTag().toString('hex')
	return `${iv.toString('hex')}-${encrypted}-${authTag}`
}

export function decryptUserId(hash: string): string | null {
	try {
		const [ivHex, encryptedHex, authTagHex] = hash.split('-')
		if (!ivHex || !encryptedHex || !authTagHex) return null
		const decipher = crypto.createDecipheriv(
			ALGORITHM,
			ENCRYPTION_BUFFER,
			Buffer.from(ivHex, 'hex')
		)
		decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
		let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
		decrypted += decipher.final('utf8')
		return decrypted
	} catch {
		return null
	}
}

const UID_SECRET = process.env.UID_SECRET!

export function makeInternalUid(provider: string, providerUserId: string) {
	return crypto
		.createHmac('sha256', UID_SECRET)
		.update(`${provider}:${providerUserId}`)
		.digest('hex')
}
