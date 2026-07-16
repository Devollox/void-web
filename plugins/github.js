'use strict'

const fs = require('fs')
const path = require('path')

let _cachedPayload = null
let _updateCb = null
let _ctx = null
let _pollTimer = null
let _rotateTimer = null
let _stateFile = null
let _lastEvent = null
let _lastSignature = ''
let _slides = []
let _slideIndex = 0
let _lastFetchAt = 0
let _imageIndex = 0

function short(s) {
	const str = String(s || '')
	return str.length > 80 ? str.slice(0, 77) + '...' : str
}

function san(v) {
	return v && String(v).trim() !== '' ? String(v) : undefined
}

async function getUsername() {
	if (_ctx) {
		const s = await _ctx.readConfig('plugin-github-state')
		if (s && s.githubUsername) return String(s.githubUsername)
	}
	try {
		if (_stateFile) {
			const d = JSON.parse(fs.readFileSync(_stateFile, 'utf-8'))
			return d.githubUsername || ''
		}
	} catch {}
	return ''
}

async function getIntervalMs() {
	if (_ctx && _ctx.readSettings) {
		try {
			const timerCfg = await _ctx.readConfig('timer-config')
			if (
				timerCfg &&
				timerCfg.updateIntervalSec &&
				Number(timerCfg.updateIntervalSec) >= 5
			) {
				return Number(timerCfg.updateIntervalSec) * 1000
			}
		} catch {}
	}
	return 30000
}

async function getImageCycles() {
	if (_ctx) {
		try {
			const cfg = await _ctx.readConfig('image-cycles')
			return Array.isArray(cfg && cfg.cycles) ? cfg.cycles : []
		} catch {}
	}
	return []
}

async function getActivityType() {
	if (_ctx) {
		try {
			const cfg = await _ctx.readConfig('activity-type')
			return cfg && cfg.type ? cfg.type : 'competing'
		} catch {}
	}
	return 'competing'
}

function getNextImageCycle(cycles) {
	if (!Array.isArray(cycles) || !cycles.length) {
		return {
			largeImage: null,
			largeText: null,
			smallImage: null,
			smallText: null,
		}
	}
	const img = cycles[_imageIndex % cycles.length]
	_imageIndex = (_imageIndex + 1) % cycles.length
	return img
}

function makeSignature(event, username) {
	if (!event) return ''
	return JSON.stringify({
		username,
		repo: event.repo?.name || '',
		type: event.type || '',
		id: event.id || '',
	})
}

function makeButtons(username, repo) {
	const buttons = []
	if (repo)
		buttons.push({ label: 'Open repo', url: 'https://github.com/' + repo })
	if (username)
		buttons.push({
			label: 'Profile',
			url: 'https://github.com/' + encodeURIComponent(username),
		})
	return buttons
}

function buildSlides(event, username) {
	const slides = []
	const repo = event.repo?.name || ''
	const type = event.type || ''
	const payload = event.payload || {}
	const commits = Array.isArray(payload.commits) ? payload.commits : []
	const pr = payload.pull_request || {}
	const issue = payload.issue || {}
	const actor = event.actor?.login || username
	const createdAt = event.created_at || ''
	const createdStr = createdAt ? new Date(createdAt).toLocaleString() : ''
	const branch = payload.ref || (pr.head && pr.head.ref) || ''

	if (type === 'PushEvent') {
		const count = commits.length || 1
		const msg = short(commits[0]?.message || '')
		slides.push({
			details: 'Pushed to ' + repo,
			state: count + ' commit(s)' + (branch ? ' on ' + branch : ''),
		})
		if (msg) slides.push({ details: 'Last commit: ' + msg, state: repo })
	} else if (type === 'PullRequestEvent') {
		const action = payload.action || 'opened'
		const num = pr.number != null ? '#' + pr.number : ''
		slides.push({
			details: 'PR ' + action + ' ' + num + ' in ' + repo,
			state: short(pr.title || repo),
		})
		if (pr.user && pr.user.login)
			slides.push({ details: 'PR by ' + pr.user.login, state: repo })
	} else if (type === 'IssuesEvent') {
		const action = payload.action || 'opened'
		const num = issue.number != null ? '#' + issue.number : ''
		slides.push({
			details: 'Issue ' + action + ' ' + num + ' in ' + repo,
			state: short(issue.title || repo),
		})
	} else if (type === 'ReleaseEvent') {
		const tag = payload.release?.tag_name || ''
		slides.push({ details: 'Released ' + (tag || 'new version'), state: repo })
	} else if (type === 'WatchEvent') {
		slides.push({ details: 'Starred ' + repo, state: actor || 'GitHub' })
	} else if (type === 'ForkEvent') {
		slides.push({ details: 'Forked ' + repo, state: actor || 'GitHub' })
	} else {
		slides.push({
			details: 'Active on GitHub',
			state: repo || username || 'GitHub',
		})
	}

	if (createdStr) slides.push({ details: 'Last activity', state: createdStr })

	const now = new Date()
	const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
	const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short' })
	slides.push({ details: 'Local time', state: timeStr + ' · ' + dateStr })

	const seen = new Set()
	return slides.filter(s => {
		const k = JSON.stringify(s)
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
}

async function buildPayload(username) {
	if (!_lastEvent || !_slides.length) {
		_cachedPayload = null
		return
	}

	const slide = _slides[_slideIndex % _slides.length]
	_slideIndex = (_slideIndex + 1) % _slides.length

	const repo = _lastEvent.repo?.name || ''
	const tsStart = Math.floor(
		new Date(_lastEvent.created_at || Date.now()).getTime() / 1000,
	)
	const buttons = makeButtons(username, repo)

	const cycles = await getImageCycles()
	const img = getNextImageCycle(cycles)
	const activityType = await getActivityType()

	const largeImage = san(img.largeImage)
	const largeText = san(img.largeText)
	const smallImage = san(img.smallImage)
	const smallText = san(img.smallText)
	const hasAssets = largeImage || largeText || smallImage || smallText

	const payload = {
		source: 'github',
		details: slide.details,
		state: slide.state,
		activityType,
		timestamps: { start: tsStart },
		priority: 60,
	}

	if (hasAssets) {
		payload.assets = {
			large_image: largeImage,
			large_text: largeText || username || 'GitHub',
			small_image: smallImage,
			small_text: smallText,
		}
	}

	if (buttons.length) {
		payload.buttons = buttons
	}

	_cachedPayload = payload
}

async function fetchGitHubEvent(username) {
	if (!username) return null
	try {
		const ctrl = new AbortController()
		const tid = setTimeout(() => ctrl.abort(), 10000)
		try {
			const res = await fetch(
				'https://api.github.com/users/' +
					encodeURIComponent(username) +
					'/events/public?per_page=5',
				{
					signal: ctrl.signal,
					headers: {
						'User-Agent': 'VoidPresence/1.0',
						Accept: 'application/vnd.github+json',
					},
				},
			)
			if (!res.ok) return null
			const events = await res.json()
			if (!Array.isArray(events) || !events.length) return null
			return events[0]
		} finally {
			clearTimeout(tid)
		}
	} catch {
		return null
	}
}

async function pollFetch() {
	if (!_pollTimer) return
	const username = await getUsername()
	const now = Date.now()
	if (now - _lastFetchAt < 5 * 60 * 1000 && _lastEvent) {
		_pollTimer = setTimeout(pollFetch, 5 * 60 * 1000)
		return
	}
	const event = await fetchGitHubEvent(username)
	if (event) {
		const sig = makeSignature(event, username)
		_lastFetchAt = Date.now()
		if (sig !== _lastSignature) {
			_lastSignature = sig
			_lastEvent = event
			_slides = buildSlides(event, username)
			_slideIndex = 0
			await buildPayload(username)
			_updateCb && _updateCb()
		}
	} else {
		_lastEvent = null
		_lastSignature = ''
		_slides = []
		_slideIndex = 0
		_cachedPayload = null
		_updateCb && _updateCb()
	}
	_pollTimer = setTimeout(pollFetch, 5 * 60 * 1000)
}

async function rotateSlides() {
	if (!_rotateTimer) return
	const username = await getUsername()
	if (_lastEvent && _slides.length) {
		await buildPayload(username)
		_updateCb && _updateCb()
	}
	const intervalMs = await getIntervalMs()
	_rotateTimer = setTimeout(rotateSlides, intervalMs)
}

module.exports = {
	id: 'github',
	nameKey: 'GitHub Activity',
	version: '2.2.0',
	builtin: false,
	priority: 60,
	locked: false,
	controls: [
		{
			type: 'input',
			id: 'github-username-input',
			labelKey: 'GitHub Username',
			hintKey: 'Your GitHub username',
			storageKey: 'githubUsername',
			placeholder: 'devollox',
			defaultValue: '',
		},
	],
	start(ctx) {
		_ctx = ctx
		_stateFile = path.join(ctx.userDataPath, 'plugin-github-state.json')
		_imageIndex = 0
		_slideIndex = 0
		_lastFetchAt = 0
		_pollTimer = setTimeout(pollFetch, 0)
		_rotateTimer = setTimeout(rotateSlides, 5000)
	},
	stop() {
		if (_pollTimer) {
			clearTimeout(_pollTimer)
			_pollTimer = null
		}
		if (_rotateTimer) {
			clearTimeout(_rotateTimer)
			_rotateTimer = null
		}
		_cachedPayload = null
		_lastEvent = null
		_lastSignature = ''
		_slides = []
		_slideIndex = 0
		_lastFetchAt = 0
		_imageIndex = 0
	},
	onUpdate(cb) {
		_updateCb = cb
	},
	getPayload() {
		return _cachedPayload
	},
}
