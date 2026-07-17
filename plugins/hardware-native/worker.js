'use strict'

// hardware-native/worker.js
// Uses systeminformation but avoids heavy WMI calls on every poll:
//   - CPU load   → os.cpus() diff (same as builtin, zero WMI)
//   - CPU name   → cached once at startup
//   - GPU stats  → cached, refreshed every 30s (WMI is expensive)
//   - CPU temp   → si.cpuTemperature(), refreshed every poll
//   - RAM        → os.totalmem/freemem (zero WMI)

const { parentPort } = require('worker_threads')
const os = require('os')
const si = require('systeminformation')

const POLL_MS       = 4000
const CACHE_MS      = 4000
const GPU_REFRESH_MS = 30000   // refresh GPU stats every 30s, not every poll

let lastStats    = null
let lastTime     = 0
let cpuNameCache = null
let gpuCache     = []
let gpuLastTime  = 0
let lastCpuSample = sampleCpu()

// ─── helpers ─────────────────────────────────────────────────────────────────

function post(data) {
  if (parentPort) parentPort.postMessage({ type: 'hardwareStats', data })
}

function postError(err) {
  if (parentPort) parentPort.postMessage({
    type: 'hardwareError',
    error: err?.message ? String(err.message) : String(err),
  })
}

function cleanName(name) {
  if (!name || typeof name !== 'string') return null
  return name
    .replace(/\s+/g, ' ')
    .replace(/\bIntel\(R\)\s+/gi, '')
    .replace(/\bAMD\s+/gi, '')
    .replace(/\bRyzen\s+/gi, '')
    .replace(/\bXeon\(R\)\s+/gi, '')
    .replace(/\bCore\(TM\)\s+/gi, '')
    .replace(/\bCPU\b/gi, '')
    .replace(/\bProcessor\b/gi, '')
    .replace(/\bNVIDIA\s+GeForce\s+/gi, '')
    .replace(/\bGeForce\s+/gi, '')
    .replace(/\bRadeon\s+/gi, '')
    .trim() || null
}

// ─── CPU load via os.cpus() diff (no WMI, same as builtin worker) ────────────

function sampleCpu() {
  const cores = os.cpus()
  if (!cores || !cores.length) return { idle: 0, total: 0 }
  let idle = 0, total = 0
  for (const c of cores) {
    for (const t of Object.values(c.times)) total += t
    idle += c.times.idle
  }
  return { idle, total }
}

function getCpuLoad() {
  const prev = lastCpuSample
  const cur  = sampleCpu()
  lastCpuSample = cur
  const idleDiff  = cur.idle  - prev.idle
  const totalDiff = cur.total - prev.total
  if (totalDiff <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)))
}

// ─── CPU name — cached once ───────────────────────────────────────────────────

async function getCpuName() {
  if (cpuNameCache) return cpuNameCache
  try {
    const data = await si.cpu()
    cpuNameCache = cleanName(data?.brand) || 'CPU'
  } catch {
    cpuNameCache = cleanName(os.cpus()?.[0]?.model) || 'CPU'
  }
  return cpuNameCache
}

// ─── CPU temp — lightweight si call ──────────────────────────────────────────

async function getCpuTemp() {
  try {
    const t = await si.cpuTemperature()
    const main = Number(t?.main)
    if (Number.isFinite(main) && main > 0 && main < 150) return Math.round(main)
    const cores = Array.isArray(t?.cores) ? t.cores : []
    const max = Math.max(...cores.map(Number).filter(Number.isFinite))
    return Number.isFinite(max) && max > 0 && max < 150 ? Math.round(max) : null
  } catch {
    return null
  }
}

// ─── GPU — cached, refreshed every 30s ───────────────────────────────────────

async function getGpu() {
  const now = Date.now()
  if (gpuCache.length && now - gpuLastTime < GPU_REFRESH_MS) return gpuCache
  try {
    const data = await si.graphics()
    gpuCache = (data?.controllers || []).map((g, idx) => ({
      index: idx,
      name:  cleanName(g.model || g.name) || `GPU ${idx + 1}`,
      model: g.model || g.name || `GPU ${idx + 1}`,
      vendor: g.vendor || null,
      temp: Number.isFinite(Number(g.temperatureGpu)) && Number(g.temperatureGpu) > 0
        ? Math.round(Number(g.temperatureGpu))
        : null,
      load: Number.isFinite(Number(g.utilizationGpu))
        ? Math.round(Number(g.utilizationGpu))
        : null,
      memory: Number.isFinite(Number(g.vram))
        ? { used: null, total: Math.round(Number(g.vram)) }
        : null,
    }))
    gpuLastTime = now
  } catch {
    // keep old cache on error
  }
  return gpuCache
}

// ─── RAM via os — no WMI ─────────────────────────────────────────────────────

function getRam() {
  const total = os.totalmem()
  const free  = os.freemem()
  const used  = total - free
  return {
    used,
    total,
    percent: Math.round((used / total) * 100),
    usedGb:  used  / 1024 / 1024 / 1024,
    totalGb: total / 1024 / 1024 / 1024,
  }
}

// ─── main poll ────────────────────────────────────────────────────────────────

async function readHardware() {
  try {
    // CPU load is synchronous (os.cpus diff), others are async but lightweight
    const cpuLoad = getCpuLoad()
    const [cpuName, cpuTemp, gpu] = await Promise.all([
      getCpuName(),
      getCpuTemp(),
      getGpu(),
    ])
    const memory = getRam()

    return {
      cpu: { name: cpuName, load: cpuLoad, temp: cpuTemp },
      gpu,
      memory,
      timestamp: Date.now(),
    }
  } catch (e) {
    postError(e)
    return { cpu: null, gpu: [], error: e.message || 'Failed to read hardware', timestamp: Date.now() }
  }
}

async function calcStats() {
  const now = Date.now()
  if (lastStats && now - lastTime < CACHE_MS) {
    post(lastStats)
    return
  }
  const stats = await readHardware()
  lastStats = stats
  lastTime  = now
  post(stats)
}

if (!parentPort) process.exit(1)

parentPort.on('message', msg => {
  if (msg === 'getHardwareStats') calcStats()
})

setInterval(() => calcStats(), POLL_MS)

calcStats()
