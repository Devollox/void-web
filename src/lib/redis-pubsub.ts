import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisPublisher = createClient({
	url,
	socket: {
		connectTimeout: 5000,
		keepAlive: true,
		reconnectStrategy: retries => Math.min(retries * 50, 500),
	},
})

export const redisSubscriber = createClient({
	url,
	socket: {
		connectTimeout: 5000,
		keepAlive: true,
		reconnectStrategy: retries => Math.min(retries * 50, 500),
	},
})

redisPublisher.on('error', () => {})
redisSubscriber.on('error', () => {})

let isPublisherConnecting = false

async function ensurePublisherConnected() {
	if (redisPublisher.isOpen) return
	if (isPublisherConnecting) {
		await new Promise(resolve => setTimeout(resolve, 100))
		return ensurePublisherConnected()
	}
	isPublisherConnecting = true
	try {
		await redisPublisher.connect()
	} catch {
	} finally {
		isPublisherConnecting = false
	}
}

export const safePublish = async (channel: string, message: string) => {
	try {
		await ensurePublisherConnected()
		if (!redisPublisher.isOpen) return
		await redisPublisher.publish(channel, message)
	} catch {}
}
