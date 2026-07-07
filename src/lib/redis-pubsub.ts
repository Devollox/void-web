import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisPublisher = createClient({
	url,
	socket: {
		connectTimeout: 2000,
		keepAlive: true,
	},
})

export const redisSubscriber = createClient({ url })

redisPublisher.on('error', () => {})
redisSubscriber.on('error', () => {})

async function ensurePublisherConnected() {
	if (!redisPublisher.isOpen) {
		await redisPublisher.connect()
	}
}

export const safePublish = async (channel: string, message: string) => {
	await ensurePublisherConnected()
	if (!redisPublisher.isOpen) {
		throw new Error('Publisher is not open')
	}
	await Promise.race([
		redisPublisher.publish(channel, message),
		new Promise((_, reject) => setTimeout(() => reject(new Error('publish timeout')), 1500)),
	])
}
