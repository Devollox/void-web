'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')
const MANIFEST_OUT = path.join(PLUGINS_DIR, 'plugins-manifest.json')
const RAW_BASE = 'https://raw.githubusercontent.com/Devollox/void-web/main/plugins'
const EXISTING_MANIFEST = fs.existsSync(MANIFEST_OUT)
	? JSON.parse(fs.readFileSync(MANIFEST_OUT, 'utf-8').replace(/^\uFEFF/, ''))
	: []

const existingById = {}
for (const entry of EXISTING_MANIFEST) {
	if (entry.id) existingById[entry.id] = entry
}

function tryParseJsDocMeta(src) {
	const m = src.match(/\/\*\s*@void-plugin\s*(\{[\s\S]*?\})\s*\*\//)
	if (!m) return null
	try {
		return JSON.parse(m[1])
	} catch {
		return null
	}
}

function tryExtractModuleExports(src, filePath) {
	try {
		const sandbox = {
			module: { exports: {} },
			exports: {},
			require: m => {
				if (['path', 'fs', 'os', 'worker_threads'].includes(m)) return {}
				throw new Error(`require('${m}') blocked in sandbox`)
			},
			__dirname: path.dirname(filePath),
			__filename: filePath,
			process: { platform: process.platform, env: {}, versions: { electron: '42.0.0' } },
			setTimeout: () => {},
			clearTimeout: () => {},
			setInterval: () => {},
			clearInterval: () => {},
			console: { log: () => {}, error: () => {}, warn: () => {} },
		}
		sandbox.exports = sandbox.module.exports
		const script = new vm.Script(src, { filename: filePath, timeout: 2000 })
		const ctx = vm.createContext(sandbox)
		script.runInContext(ctx)
		const exp = sandbox.module.exports
		if (exp && typeof exp === 'object' && exp.id) return exp
		return null
	} catch {
		return null
	}
}

function extractMeta(filePath) {
	const src = fs.readFileSync(filePath, 'utf-8')
	const jsdoc = tryParseJsDocMeta(src)
	if (jsdoc && jsdoc.id) return jsdoc

	const mod = tryExtractModuleExports(src, filePath)
	if (mod) return mod

	const idM = src.match(/\bid:\s*['"]([^'"]+)['"]/)
	const verM = src.match(/\bversion:\s*['"]([^'"]+)['"]/)
	const nameM = src.match(/\bnameKey:\s*['"]([^'"]+)['"]/)
	if (idM) {
		return {
			id: idM[1],
			version: verM ? verM[1] : '1.0.0',
			nameKey: nameM ? nameM[1] : idM[1],
		}
	}

	return null
}

function buildEntry(id, meta, sourceUrl, isFolder) {
	const existing = existingById[id] || {}

	const slides = existing.preview?.slides ?? buildSlides(meta)

	return {
		id,
		// existing manual values take priority over parsed meta
		title:       existing.title       ?? meta.title       ?? meta.nameKey ?? id,
		description: existing.description ?? meta.description ?? '',
		author:      existing.author      ?? meta.author      ?? 'Community',
		version:     meta.version         ?? existing.version ?? '1.0.0',
		downloads:   existing.downloads   ?? 0,
		sourceUrl,
		tags:        existing.tags        ?? meta.tags        ?? [],
		folder:      isFolder,
		preview: {
			...(existing.preview ?? {}),
			...(meta.preview ?? {}),
			slides,
		},
	}
}

function buildSlides(meta) {
	const slides = []

	if (meta.preview?.details) slides.push(meta.preview.details)
	if (meta.preview?.state) slides.push(meta.preview.state)

	if (Array.isArray(meta.controls)) {
		for (const c of meta.controls.slice(0, 3 - slides.length)) {
			if (c.labelKey) slides.push(c.labelKey)
		}
	}

	if (!slides.length) slides.push(meta.nameKey || meta.id || 'Plugin')
	return slides
}

const entries = []
const seen = new Set()

const items = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })

for (const item of items) {
	if (item.name === 'plugins-manifest.json' || item.name === 'README.md') continue

	let filePath, isFolder, id, sourceUrl

	if (item.isFile() && item.name.endsWith('.js')) {
		filePath = path.join(PLUGINS_DIR, item.name)
		isFolder = false
		id = item.name.replace(/\.js$/, '')
		sourceUrl = `${RAW_BASE}/${item.name}`
	} else if (item.isDirectory()) {
		const indexPath = path.join(PLUGINS_DIR, item.name, 'index.js')
		const manifestPath = path.join(PLUGINS_DIR, item.name, 'manifest.json')

		if (fs.existsSync(manifestPath)) {
			try {
				const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
				id = m.id || item.name
				isFolder = true
				sourceUrl = m.sourceUrl || `${RAW_BASE}/${item.name}/${item.name}.zip`
				const entry = buildEntry(id, m, sourceUrl, isFolder)
				if (!seen.has(id)) {
					entries.push(entry)
					seen.add(id)
				}
				continue
			} catch {}
		}

		if (!fs.existsSync(indexPath)) continue
		filePath = indexPath
		isFolder = true
		id = item.name
		sourceUrl = `${RAW_BASE}/${item.name}/${item.name}.zip`
	} else {
		continue
	}

	const meta = extractMeta(filePath)
	if (!meta) {
		console.warn(`[warn] Could not extract metadata from ${filePath}, skipping`)
		continue
	}

	const resolvedId = meta.id || id
	if (seen.has(resolvedId)) continue
	seen.add(resolvedId)

	entries.push(buildEntry(resolvedId, meta, sourceUrl, isFolder))
}

entries.sort((a, b) => {
	const ai = EXISTING_MANIFEST.findIndex(e => e.id === a.id)
	const bi = EXISTING_MANIFEST.findIndex(e => e.id === b.id)
	if (ai !== -1 && bi !== -1) return ai - bi
	if (ai !== -1) return -1
	if (bi !== -1) return 1
	return a.id.localeCompare(b.id)
})

fs.writeFileSync(MANIFEST_OUT, JSON.stringify(entries, null, '\t'), 'utf-8')
console.log(`[manifest] Written ${entries.length} plugin(s) to ${MANIFEST_OUT}`)
for (const e of entries) {
	console.log(`  ${e.folder ? '📁' : '📄'} ${e.id} v${e.version} — ${e.sourceUrl}`)
}
