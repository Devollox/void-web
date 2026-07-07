import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisPublisher = createClient({ url })
export const redisSubscriber = createClient({ url })

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
