import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisPublisher = createClient({
	url,
	socket: {
		connectTimeout: 5000,
		keepAlive: true,
	},
})
export const redisSubscriber = createClient({ url })

async function ensurePublisherConnected() {
	if (process.env.NEXT_PHASE === 'phase-production-build') {
		return false
	}

	if (redisPublisher.isOpen) {
		return true
	}

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
		if (!isConnected) {
			return
		}

		const receiverCount = await Promise.race([
			redisPublisher.publish(channel, message),
			new Promise<number>((_, reject) =>
				setTimeout(() => reject(new Error('Publish command timeout')), 2000)
			),
		])
	} catch {}
}
