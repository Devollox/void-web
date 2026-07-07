import { Redis } from '@upstash/redis'

const redisPub = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const safePublish = async (channel: string, message: string) => {
	try {
		await redisPub.publish(channel, message)
	} catch {}
}
