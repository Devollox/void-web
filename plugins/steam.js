'use strict'

const fs = require('fs')
const path = require('path')

let _cachedPayload = null
let _updateCb = null
let _ctx = null
let _timer = null
let _lastGame = ''
let _stateFile = null

function stateRead(key, fallback = '') {
	try {
		const data = JSON.parse(fs.readFileSync(_stateFile, 'utf-8'))
		return data[key] ?? fallback
	} catch {
		return fallback
	}
}

function stateWrite(key, value) {
	try {
		let data = {}
		try {
			data = JSON.parse(fs.readFileSync(_stateFile, 'utf-8'))
		} catch {}
		data[key] = value
		fs.writeFileSync(_stateFile, JSON.stringify(data, null, 2), 'utf-8')
	} catch {}
}

async function fetchSteamGame(steamUrl) {
	if (!steamUrl || !steamUrl.trim()) return null

	try {
		const url = steamUrl.trim().replace(/\/$/, '') + '/'
		const ctrl = new AbortController()
		const tid = setTimeout(() => ctrl.abort(), 10_000)

		try {
			const res = await fetch(url, {
				signal: ctrl.signal,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/120.0',
				},
			})
			if (!res.ok) return null

			const html = await res.text()

			const inGame = html.match(
				/class="profile_in_game_name"[^>]*>\s*([^<]+?)\s*</,
			)
			if (inGame && inGame[1].trim()) return inGame[1].trim()

			return null
		} finally {
			clearTimeout(tid)
		}
	} catch (e) {
		_ctx?.sendLog(`[steam-plugin] fetch error: ${e?.message ?? e}`, 'error')
		return null
	}
}

async function poll() {
	if (!_timer) return

	const steamUrl = stateRead(
		'steamUrl',
		'https://steamcommunity.com/id/Devollox/',
	)
	const game = await fetchSteamGame(steamUrl)

	if (game && game !== _lastGame) {
		_lastGame = game
		_cachedPayload = {
			source: 'steam',
			details: game,
			state: 'Playing on Steam',
			activityType: 'playing',
			priority: 75,
		}
		_updateCb?.()
		_ctx?.sendLog(`[steam-plugin] Now playing: ${game}`, 'info')
	} else if (!game && _cachedPayload !== null) {
		_lastGame = ''
		_cachedPayload = null
		_updateCb?.()
	}

	_timer = setTimeout(poll, 60_000)
}

module.exports = {
	id: 'steam',
	nameKey: 'Steam Activity',
	version: '1.0.0',
	builtin: false,
	priority: 75,
	locked: false,
	author: 'Devollox',
	description: 'Fetches your current Steam game from your public Steam profile page and shows it in Discord RPC. Updates every 60 seconds.',
	tags: ['steam', 'gaming', 'game'],
	preview: {
		activityType: 'playing',
		slides: [
			'Counter-Strike 2',
			'Playing on Steam',
			'steamcommunity.com/id/...',
		],
	},

	controls: [
		{
			type: 'input',
			id: 'steam-url-input',
			labelKey: 'Steam URL',
			hintKey: 'e.g. https://steamcommunity.com/id/Devollox',
			storageKey: 'steamUrl',
			placeholder: 'https://steamcommunity.com/id/...',
			defaultValue: 'https://steamcommunity.com/id/Devollox/',
		},
	],

	start(ctx) {
		_ctx = ctx
		_stateFile = path.join(ctx.userDataPath, 'plugin-steam-state.json')
		_timer = setTimeout(poll, 0)
	},

	stop() {
		if (_timer) {
			clearTimeout(_timer)
			_timer = null
		}
		_cachedPayload = null
		_lastGame = ''
	},

	onUpdate(cb) {
		_updateCb = cb
	},
	getPayload() {
		return _cachedPayload
	},
}