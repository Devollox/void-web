import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

const socketConfig = {
	connectTimeout: 5000,
	keepAlive: true,
	reconnectStrategy(retries: number) {
		return Math.min(retries * 200, 2000)
	},
}

export const redisPublisher = createClient({
	url,
	socket: socketConfig,
})

export const redisSubscriber = createClient({
	url,
	socket: socketConfig,
})

async function ensurePublisherConnected() {
	if (process.env.NEXT_PHASE === 'phase-production-build') return false
	if (redisPublisher.isOpen) return true

	try {
		await Promise.race([
			redisPublisher.connect(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Connection timeout exceeded')), 3000)
			),
		])
		return redisPublisher.isOpen
	} catch {
		return false
	}
}

export const safePublish = async (channel: string, message: string) => {
	try {
		const isConnected = await ensurePublisherConnected()
		if (!isConnected) return

		await Promise.race([
			redisPublisher.publish(channel, message),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Publish command timeout')), 2000)
			),
		])
	} catch {}
}
