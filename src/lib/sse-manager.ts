type ConfigKind = 'presence' | 'status'

type ConfigListSub = {
	id: string
	kind: ConfigKind
	send: (event: string, data: any) => void
	close: () => void
}

type ConfigDetailsSub = {
	id: string
	kind: ConfigKind
	configId: string
	send: (event: string, data: any) => void
	close: () => void
}

type AuthorSub = {
	id: string
	authorId: string
	send: (event: string, data: any) => void
	close: () => void
}

type StatsSub = {
	id: string
	send: (event: string, data: any) => void
	close: () => void
}

class SseManager {
	private configListSubs = new Map<string, ConfigListSub>()
	private configDetailsSubs = new Map<string, ConfigDetailsSub>()
	private authorSubs = new Map<string, AuthorSub>()
	private statsSubs = new Map<string, StatsSub>()

	addConfigListSub(sub: ConfigListSub) {
		this.configListSubs.set(sub.id, sub)
	}

	removeConfigListSub(id: string) {
		this.configListSubs.delete(id)
	}

	getConfigListSubsByKind(kind: ConfigKind): ConfigListSub[] {
		const result: ConfigListSub[] = []
		for (const sub of this.configListSubs.values()) {
			if (sub.kind === kind) result.push(sub)
		}
		return result
	}

	addConfigDetailsSub(sub: ConfigDetailsSub) {
		this.configDetailsSubs.set(sub.id, sub)
	}

	removeConfigDetailsSub(id: string) {
		this.configDetailsSubs.delete(id)
	}

	getConfigDetailsSubsByConfig(kind: ConfigKind, configId: string): ConfigDetailsSub[] {
		const result: ConfigDetailsSub[] = []
		for (const sub of this.configDetailsSubs.values()) {
			if (sub.kind === kind && sub.configId === configId) result.push(sub)
		}
		return result
	}

	addAuthorSub(sub: AuthorSub) {
		this.authorSubs.set(sub.id, sub)
	}

	removeAuthorSub(id: string) {
		this.authorSubs.delete(id)
	}

	getAuthorSubsByAuthor(authorId: string): AuthorSub[] {
		const result: AuthorSub[] = []
		for (const sub of this.authorSubs.values()) {
			if (sub.authorId === authorId) result.push(sub)
		}
		return result
	}

	broadcastToAuthor(authorId: string, event: string, data: any) {
		for (const sub of this.authorSubs.values()) {
			if (sub.authorId === authorId) {
				sub.send(event, data)
			}
		}
	}

	notifyAuthorDownloads(
		authorId: string,
		id: string,
		kind: 'presence' | 'status',
		downloads: number
	) {
		this.broadcastToAuthor(authorId, 'downloads', { id, kind, downloads })
	}

	notifyConfigListDownloads(id: string, kind: 'presence' | 'status', downloads: number) {
		for (const sub of this.configListSubs.values()) {
			if (sub.kind === kind) {
				sub.send('downloads', { id, kind, downloads })
			}
		}
	}

	notifyAuthorProfileUpdate(authorId: string, data: any) {
		this.broadcastToAuthor(authorId, 'profile-update', data)
	}

	addStatsSub(sub: StatsSub) {
		this.statsSubs.set(sub.id, sub)
	}

	removeStatsSub(id: string) {
		this.statsSubs.delete(id)
	}

	broadcastStats(event: string, data: any) {
		for (const sub of this.statsSubs.values()) {
			sub.send(event, data)
		}
	}
}

export const sseManager = new SseManager()
