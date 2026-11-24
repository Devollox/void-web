import 'server-only'
import { createHash } from 'node:crypto'
import { isRecord, isTicket, type DesktopTicketRecord } from '@/services/desktop-auth'

export const DESKTOP_ATTEMPT_TTL = 180

export type DesktopAttemptStatus = 'pending' | 'exchanged'

export interface DesktopAttemptRecord {
	version: 1
	purpose: 'desktop-connect-status'
	authorId: string
	status: DesktopAttemptStatus
	expiresAt: number
}

export type TrackedDesktopTicketRecord = DesktopTicketRecord & {
	attemptId: string
}

export function getAttemptKey(attemptId: string): string {
	const hash = createHash('sha256').update(attemptId).digest('hex')

	return `desktop:connect:attempt:${hash}`
}

export function parseStoredJson(value: unknown): unknown {
	if (typeof value !== 'string') return value

	try {
		return JSON.parse(value) as unknown
	} catch {
		return null
	}
}

export function readAttempt(value: unknown): DesktopAttemptRecord | null {
	const parsed = parseStoredJson(value)

	if (!isRecord(parsed)) return null
	if (parsed.version !== 1) return null
	if (parsed.purpose !== 'desktop-connect-status') return null
	if (typeof parsed.authorId !== 'string' || !parsed.authorId) return null

	if (parsed.status !== 'pending' && parsed.status !== 'exchanged') {
		return null
	}

	if (typeof parsed.expiresAt !== 'number' || !Number.isFinite(parsed.expiresAt)) {
		return null
	}

	return {
		version: 1,
		purpose: 'desktop-connect-status',
		authorId: parsed.authorId,
		status: parsed.status,
		expiresAt: parsed.expiresAt,
	}
}

export function readTicketAttemptId(value: unknown): string | null {
	const parsed = parseStoredJson(value)

	if (!isRecord(parsed)) return null
	if (parsed.version !== 1) return null
	if (parsed.purpose !== 'desktop-connect') return null
	if (!isTicket(parsed.attemptId)) return null

	return parsed.attemptId
}
