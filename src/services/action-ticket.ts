import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

export const ACTION_TICKET_TTL = 60
export const ACTION_TICKET_MAX_BODY = 4096

export const ACTION_HEADERS = {
	'Cache-Control': 'no-store',
	'Referrer-Policy': 'no-referrer',
	Pragma: 'no-cache',
} as const

export const SITE_ORIGIN = 'https://voidpresence.com'

export interface ImportConfigAction {
	kind: 'import-config'
	configId: string
	title: string
	configData: {
		cycles?: unknown[]
		imageCycles?: unknown[]
		buttonPairs?: unknown[]
		party?: unknown[]
		timeCycles?: unknown[]
	}
}

export interface ImportStatusAction {
	kind: 'import-status'
	configId: string
	title: string
	configData: {
		statusCycles: unknown[]
	}
}

export interface InstallPluginAction {
	kind: 'install-plugin'
	pluginId: string
	title: string
	version: string
	sourceUrl: string
	isFolder: boolean
}

export type ActionPayload = ImportConfigAction | ImportStatusAction | InstallPluginAction

export interface ActionTicketRecord {
	version: 1
	purpose: 'action-ticket'
	kind: ActionPayload['kind']
	expiresAt: number
	payload: ActionPayload
}

export function createActionTicket(): string {
	return randomBytes(32).toString('base64url')
}

export function getActionTicketKey(ticket: string): string {
	const hash = createHash('sha256').update(ticket).digest('hex')
	return `action:ticket:v1:${hash}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isActionTicket(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function readImportConfigPayload(
	configId: string,
	raw: Record<string, unknown>
): ImportConfigAction | null {
	const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 256) : ''

	const rawData = isRecord(raw.configData) ? raw.configData : {}

	const cycles = Array.isArray(rawData.cycles) ? rawData.cycles.slice(0, 64) : []
	const imageCycles = Array.isArray(rawData.imageCycles) ? rawData.imageCycles.slice(0, 64) : []
	const buttonPairs = Array.isArray(rawData.buttonPairs) ? rawData.buttonPairs.slice(0, 16) : []
	const party = Array.isArray(rawData.party) ? rawData.party.slice(0, 16) : []
	const timeCycles = Array.isArray(rawData.timeCycles) ? rawData.timeCycles.slice(0, 64) : []

	return {
		kind: 'import-config',
		configId,
		title: title || 'Imported config',
		configData: { cycles, imageCycles, buttonPairs, party, timeCycles },
	}
}

export function readImportStatusPayload(
	configId: string,
	raw: Record<string, unknown>
): ImportStatusAction | null {
	const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 256) : ''

	const rawData = isRecord(raw.configData) ? raw.configData : {}
	const statusCycles = Array.isArray(rawData.statusCycles) ? rawData.statusCycles.slice(0, 256) : []

	return {
		kind: 'import-status',
		configId,
		title: title || 'Imported status',
		configData: { statusCycles },
	}
}

export function readInstallPluginPayload(
	pluginId: string,
	raw: Record<string, unknown>
): InstallPluginAction | null {
	const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 256) : pluginId
	const version = typeof raw.version === 'string' ? raw.version.trim().slice(0, 64) : '0.0.0'
	const sourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl : ''
	const isFolder = (raw as any).folder === true

	if (!sourceUrl) return null

	try {
		const u = new URL(sourceUrl)
		if (u.protocol !== 'https:') return null
	} catch {
		return null
	}

	return {
		kind: 'install-plugin',
		pluginId,
		title: title || pluginId,
		version,
		sourceUrl,
		isFolder,
	}
}

export const EXCHANGE_ACTION_SCRIPT = `
local raw = redis.call('GET', KEYS[1])

if not raw then
  return {err = 'not_found'}
end

local ok, record = pcall(cjson.decode, raw)

if not ok or type(record) ~= 'table' then
  return {err = 'invalid_record'}
end

if record.version ~= 1 or record.purpose ~= 'action-ticket' then
  return {err = 'wrong_purpose'}
end

local now = redis.call('TIME')
local nowMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if type(record.expiresAt) ~= 'number' or record.expiresAt <= nowMs then
  return {err = 'expired'}
end

if type(record.payload) ~= 'table' then
  return {err = 'invalid_payload'}
end

local payload = cjson.encode(record.payload)

redis.call('DEL', KEYS[1])

return payload
`
