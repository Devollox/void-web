'use strict'

// External hardware plugin — mirrors builtin hardware-plugin logic 1-to-1
// Uses `systeminformation` npm module OR a worker.js if present in plugin folder.
// If worker.js exists in the plugin directory, it's used via Worker threads
// (same pattern as builtin hardware-plugin). Otherwise falls back to in-process polling.

const { Worker } = require('worker_threads')
const path = require('path')

let si
try {
	si = require('systeminformation')
} catch (e) {
	si = null
}

// ─── bar styles (same as builtin) ────────────────────────────────────────────

const BAR_STYLES = {
	unicode: { full: '▰', empty: '▱' },
	cmd: { full: '#', empty: '-' },
	block: { full: '█', empty: '░' },
	soft: { full: '█', empty: '▒' },
	retro: { full: '●', empty: '○' },
	cyber: { full: '█', empty: '▁' },
}

async function bar(p, ctx) {
	const settings = await ctx.readSettings()
	const style = settings.barStyle || 'unicode'
	const cfg = BAR_STYLES[style] || BAR_STYLES.unicode
	const n = Number(p)
	const core = !Number.isFinite(n)
		? cfg.empty.repeat(10)
		: (() => {
				const x = Math.max(0, Math.min(100, Math.round(n)))
				const filled = Math.max(0, Math.min(10, Math.floor((x / 100) * 10)))
				return cfg.full.repeat(filled) + cfg.empty.repeat(10 - filled)
			})()
	return style === 'unicode' ? core : `[${core}]`
}

// ─── name cleanup (same regex as builtin) ────────────────────────────────────

function cleanDeviceName(name) {
	if (typeof name !== 'string') return null
	return name.trim() || null
}

// ─── config helpers — loaded from userData JSON files via ctx.readConfig ─────

async function readImageCyclesConfig(ctx) {
	const cfg = await ctx.readConfig('imageCycles')
	return cfg && Array.isArray(cfg.cycles) ? cfg : { cycles: [] }
}

async function readActivityTypeConfig(ctx) {
	const cfg = await ctx.readConfig('activityType')
	return cfg && cfg.type ? cfg : { type: 0 }
}

async function readButtonsConfig(ctx) {
	const cfg = await ctx.readConfig('buttons')
	return cfg && Array.isArray(cfg.pairs) ? cfg : { pairs: [] }
}

async function readTimerConfig(ctx) {
	const cfg = await ctx.readConfig('timer')
	return cfg && cfg.updateIntervalSec ? cfg : { updateIntervalSec: 30 }
}

// ─── module-level state ───────────────────────────────────────────────────────

let _imageIndex = 0
let _buttonIndex = 0
let _lineIndex = 0
let _lastStats = null
let _currentPayload = null
let _rotateTimer = null
let _pollTimer = null
let _updateCb = null
let _ctx = null
let _worker = null
let _workerReady = false

// ─── hardware polling via systeminformation ───────────────────────────────────

const POLL_MS = 4000

async function fetchStats() {
	if (!si) return null
	try {
		const [cpuData, cpuTemp, gpuData, memData, cpuLoad] = await Promise.all([
			si.cpu(),
			si.cpuTemperature(),
			si.graphics(),
			si.mem(),
			si.currentLoad(),
		])

		const cpuName =
			cleanDeviceName(
				cpuData.brand
					? cpuData.brand
							.replace(/\bIntel\(R\)\s*/gi, '')
							.replace(/\bAMD\s*/gi, '')
							.replace(/\bRyzen\s*/gi, '')
							.replace(/\bCore\(TM\)\s*/gi, '')
							.replace(/\bCPU\b/gi, '')
							.replace(/\bProcessor\b/gi, '')
							.trim()
					: null
			) || 'CPU'

		// CPU temp: prefer main, fallback to max of cores
		const cpuTempVal = (() => {
			const main = Number(cpuTemp?.main)
			if (Number.isFinite(main) && main > 0 && main < 150) return Math.round(main)
			const cores = Array.isArray(cpuTemp?.cores) ? cpuTemp.cores : []
			const max = Math.max(...cores.map(Number).filter(Number.isFinite))
			return Number.isFinite(max) && max > 0 && max < 150 ? Math.round(max) : null
		})()

		// GPUs
		const gpus = (gpuData?.controllers || []).map((g, idx) => ({
			index: idx,
			name:
				cleanDeviceName(
					(g.model || g.name || '')
						.replace(/\bNVIDIA\s+GeForce\s*/gi, '')
						.replace(/\bGeForce\s*/gi, '')
						.replace(/\bRadeon\s*/gi, '')
						.trim()
				) || `GPU ${idx + 1}`,
			model: g.model || g.name || `GPU ${idx + 1}`,
			vendor: g.vendor || null,
			temp:
				Number.isFinite(Number(g.temperatureGpu)) && Number(g.temperatureGpu) > 0
					? Math.round(Number(g.temperatureGpu))
					: null,
			load: Number.isFinite(Number(g.utilizationGpu)) ? Math.round(Number(g.utilizationGpu)) : null,
			memory: Number.isFinite(Number(g.vram))
				? { used: null, total: Math.round(Number(g.vram)) }
				: null,
		}))

		const total = Number(memData?.total)
		const used = Number(memData?.used)

		return {
			cpu: {
				name: cpuName,
				load: Number.isFinite(Number(cpuLoad?.currentLoad))
					? Math.round(Number(cpuLoad.currentLoad))
					: null,
				temp: cpuTempVal,
			},
			gpu: gpus,
			memory: {
				used,
				total,
				percent: Number.isFinite(total) && total > 0 ? Math.round((used / total) * 100) : null,
				usedGb: used / 1024 / 1024 / 1024,
				totalGb: total / 1024 / 1024 / 1024,
			},
			timestamp: Date.now(),
		}
	} catch {
		return null
	}
}

// ─── build display entries (same shape as builtin) ────────────────────────────

function buildEntries(stats) {
	const entries = []
	if (!stats || typeof stats !== 'object') return entries

	if (stats.cpu && (stats.cpu.name || stats.cpu.load != null)) {
		entries.push({
			label: cleanDeviceName(stats.cpu.name) || 'CPU',
			temp:
				Number.isFinite(Number(stats.cpu.temp)) && Number(stats.cpu.temp) !== 0
					? `${Math.round(Number(stats.cpu.temp))}°C`
					: null,
			load: Number.isFinite(Number(stats.cpu.load)) ? Number(stats.cpu.load) : null,
		})
	}

	const gpus = Array.isArray(stats.gpu) ? stats.gpu : []
	gpus.forEach((gpu, idx) => {
		entries.push({
			label: cleanDeviceName(gpu?.name || gpu?.model) || `GPU ${idx + 1}`,
			temp:
				Number.isFinite(Number(gpu?.temp)) && Number(gpu?.temp) > 0
					? `${Math.round(Number(gpu.temp))}°C`
					: null,
			load: Number.isFinite(Number(gpu?.load)) ? Number(gpu.load) : null,
		})
	})

	const total = Number(stats.memory?.total)
	const used = Number(stats.memory?.used)
	const percent = Number(stats.memory?.percent)
	if (Number.isFinite(total) && Number.isFinite(used)) {
		entries.push({
			label: 'RAM',
			temp: `${(used / 1024 / 1024 / 1024).toFixed(1)}/${(total / 1024 / 1024 / 1024).toFixed(1)} GB`,
			load: Number.isFinite(percent) ? percent : Math.round((used / total) * 100),
		})
	}

	return entries
}

// ─── cycle helpers (same as builtin) ─────────────────────────────────────────

function getNextImageCycle(cycles) {
	if (!cycles.length)
		return { largeImage: null, largeText: null, smallImage: null, smallText: null }
	const img = cycles[_imageIndex % cycles.length]
	_imageIndex = (_imageIndex + 1) % cycles.length
	return img
}

function getNextButtons(buttonPairs) {
	if (!Array.isArray(buttonPairs) || !buttonPairs.length) return []
	const pair = buttonPairs[_buttonIndex % buttonPairs.length]
	_buttonIndex = (_buttonIndex + 1) % buttonPairs.length
	const res = []
	if (pair?.label1 && pair?.url1) res.push({ label: pair.label1, url: pair.url1 })
	if (pair?.label2 && pair?.url2) res.push({ label: pair.label2, url: pair.url2 })
	return res
}

const san = v => (v && String(v).trim() !== '' ? v : undefined)

// ─── payload builder (same logic as builtin refreshPayload) ───────────────────

async function refreshPayload() {
	if (!_ctx) return
	const stats = _lastStats
	if (!stats) {
		_currentPayload = null
		return
	}

	const entries = buildEntries(stats)
	if (!entries.length) {
		_currentPayload = null
		return
	}

	const [imagesCfg, typeCfg, buttonsCfg] = await Promise.all([
		readImageCyclesConfig(_ctx),
		readActivityTypeConfig(_ctx),
		readButtonsConfig(_ctx),
	])

	const entry = entries[_lineIndex % entries.length]
	const barStr = await bar(entry.load, _ctx)
	const state = [entry.label, entry.temp, entry.load != null ? `${entry.load}%` : null]
		.filter(Boolean)
		.join(' | ')

	const img = getNextImageCycle(imagesCfg.cycles)
	const activityType = typeCfg.type
	const buttons = getNextButtons(buttonsCfg.pairs)

	const largeImage = san(img.largeImage)
	const largeText = san(img.largeText)
	const smallImage = san(img.smallImage)
	const smallText = san(img.smallText)
	const hasAssets = largeImage || largeText || smallImage || smallText

	_currentPayload = {
		source: 'hardware',
		details: barStr,
		state,
		activityType,
		...(hasAssets
			? {
					assets: {
						large_image: largeImage,
						large_text: largeText,
						small_image: smallImage,
						small_text: smallText,
					},
				}
			: {}),
		...(buttons.length ? { buttons } : {}),
		priority: 50,
	}
}

// ─── rotate timer (same as builtin startRotateTimer) ─────────────────────────

async function startRotateTimer() {
	if (_rotateTimer) return

	async function tick() {
		if (!_rotateTimer) return
		if (_lastStats) {
			const entries = buildEntries(_lastStats)
			if (entries.length) {
				_lineIndex = (_lineIndex + 1) % entries.length
				await refreshPayload()
			}
		}
		_updateCb?.()

		const { updateIntervalSec } = await readTimerConfig(_ctx)
		const intervalMs = (updateIntervalSec && updateIntervalSec >= 5 ? updateIntervalSec : 30) * 1000
		_rotateTimer = setTimeout(tick, intervalMs)
	}

	_rotateTimer = setTimeout(tick, 0)
}

function stopRotateTimer() {
	if (_rotateTimer) {
		clearTimeout(_rotateTimer)
		_rotateTimer = null
	}
}

// ─── worker support (optional worker.js in plugin folder) ────────────────────

function startWorker(workerPath) {
	if (_worker) return

	_worker = new Worker(workerPath, { env: { ...process.env } })

	_worker.on('message', async msg => {
		if (!msg || typeof msg !== 'object') return
		if (msg.type === 'hardwareStats') {
			_lastStats = msg.data
			const first = !_workerReady
			_workerReady = true
			await refreshPayload()
			if (first) _updateCb?.()
		}
	})

	_worker.on('error', err => {
		_ctx?.sendLog?.(`[hardware-native] Worker error: ${err.message}`, 'error')
	})

	_worker.on('exit', () => {
		_worker = null
	})
}

function stopWorker() {
	if (_worker) {
		_worker.terminate()
		_worker = null
	}
	_workerReady = false
}

// ─── in-process poll loop (fallback when no worker.js) ───────────────────────

function startPoll() {
	if (_pollTimer) return

	async function tick() {
		if (!_pollTimer) return
		const stats = await fetchStats()
		if (stats) {
			const first = !_lastStats
			_lastStats = stats
			await refreshPayload()
			if (first) _updateCb?.()
		}
		_pollTimer = setTimeout(tick, POLL_MS)
	}

	_pollTimer = setTimeout(tick, 0)
}

function stopPoll() {
	if (_pollTimer) {
		clearTimeout(_pollTimer)
		_pollTimer = null
	}
}

// ─── stop all ────────────────────────────────────────────────────────────────

function stopAll() {
	stopRotateTimer()
	stopWorker()
	stopPoll()
	_lastStats = null
	_currentPayload = null
	_lineIndex = 0
	_buttonIndex = 0
	_imageIndex = 0
	_ctx = null
}

// ─── plugin export ───────────────────────────────────────────────────────────

module.exports = {
	id: 'hardware-native',
	nameKey: 'Hardware (native)',
	version: '1.0.0',
	builtin: false,
	priority: 50,
	locked: false,
	controls: [
		{
			type: 'toggle',
			id: 'hardware-native-monitor-toggle',
			labelKey: 'activity.hardwareFilter',
			hintKey: 'activity.hardwareDetection',
			storageKey: 'hardwareMonitorEnabled',
			ipcMethod: 'setHardwareMonitor',
			defaultValue: false,
		},
		{
			type: 'select',
			id: 'hardware-native-bar-style',
			labelKey: 'barStyle.label',
			storageKey: 'barStyle',
			ipcMethod: 'setBarStyleConfig',
			defaultValue: 'unicode',
			options: [
				{ value: 'unicode', labelKey: 'barStyle.unicode' },
				{ value: 'cmd', labelKey: 'barStyle.cmd' },
				{ value: 'block', labelKey: 'barStyle.block' },
				{ value: 'soft', labelKey: 'barStyle.soft' },
				{ value: 'retro', labelKey: 'barStyle.retro' },
				{ value: 'cyber', labelKey: 'barStyle.cyber' },
			],
		},
	],

	async start(ctx) {
		_ctx = ctx
		_lineIndex = 0
		_buttonIndex = 0
		_imageIndex = 0

		const settings = await ctx.readSettings()
		if (!settings.hardwareMonitorEnabled) return

		// If plugin folder has a worker.js — use it (Worker threads, same as builtin)
		// Otherwise fall back to in-process systeminformation polling
		if (ctx.pluginDir) {
			const fs = require('fs')
			const workerPath = path.join(ctx.pluginDir, 'worker.js')
			if (fs.existsSync(workerPath)) {
				ctx.sendLog('[hardware-native] Using worker.js', 'info')
				startWorker(workerPath)
				startRotateTimer()
				return
			}
		}

		if (!si) {
			ctx.sendLog('[hardware-native] systeminformation not loaded', 'error')
			return
		}

		ctx.sendLog('[hardware-native] Using in-process polling (no worker.js found)', 'info')
		startPoll()
		startRotateTimer()
	},

	stop() {
		stopAll()
	},

	onUpdate(cb) {
		_updateCb = cb
	},

	getPayload() {
		return _currentPayload
	},
}
