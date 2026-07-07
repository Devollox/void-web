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
		try {
			await redisPublisher.connect()
		} catch {}
	}
}

export const safePublish = async (channel: string, message: string) => {
	try {
		await ensurePublisherConnected()
		if (redisPublisher.isOpen) {
			await Promise.race([
				redisPublisher.publish(channel, message),
				new Promise((_, reject) => setTimeout(() => reject(new Error()), 1500)),
			])
		}
	} catch {}
}
