export type ConfigListKind = 'presence' | 'status'

type ConfigListSubscriber = {
	id: string
	kind: ConfigListKind
	send: (event: string, data: any) => void
	close: () => void
}

type ConfigDetailsSubscriber = {
	id: string
	kind: ConfigListKind
	configId: string
	send: (event: string, data: any) => void
	close: () => void
}

type AuthorSubscriber = {
	id: string
	authorId: string
	send: (event: string, data: any) => void
	close: () => void
}

class SseManager {
	private configListSubs = new Map<string, ConfigListSubscriber>()
	private configDetailsSubs = new Map<string, ConfigDetailsSubscriber>()
	private authorSubs = new Map<string, AuthorSubscriber>()

	addConfigListSub(sub: ConfigListSubscriber) {
		this.configListSubs.set(sub.id, sub)
	}

	removeConfigListSub(id: string) {
		this.configListSubs.delete(id)
	}

	addConfigDetailsSub(sub: ConfigDetailsSubscriber) {
		this.configDetailsSubs.set(sub.id, sub)
	}

	removeConfigDetailsSub(id: string) {
		this.configDetailsSubs.delete(id)
	}

	addAuthorSub(sub: AuthorSubscriber) {
		this.authorSubs.set(sub.id, sub)
	}

	removeAuthorSub(id: string) {
		this.authorSubs.delete(id)
	}

	getConfigListSubsByKind(kind: ConfigListKind) {
		return Array.from(this.configListSubs.values()).filter(s => s.kind === kind)
	}

	getConfigDetailsSubsByConfig(kind: ConfigListKind, configId: string) {
		return Array.from(this.configDetailsSubs.values()).filter(
			s => s.kind === kind && s.configId === configId
		)
	}

	getAuthorSubsByAuthor(authorId: string) {
		return Array.from(this.authorSubs.values()).filter(s => s.authorId === authorId)
	}
}

export const sseManager = new SseManager()
