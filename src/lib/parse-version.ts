export function parseElectronVersionFromNotes(notes: string): string | undefined {
	const lines = notes.split(/\r?\n/).map(line => line.trim())

	for (const line of lines) {
		const match = line.match(/Updated\s+Electron\s+to\s+([0-9]+(?:\.[0-9]+){2})/i)
		if (match?.[1]) {
			return match[1]
		}
	}

	let inDependencies = false

	for (const line of lines) {
		if (/^dependencies$/i.test(line)) {
			inDependencies = true
			continue
		}

		if (inDependencies) {
			if (!line) break

			const depsMatch = line.match(/Electron[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
			if (depsMatch?.[1]) {
				return depsMatch[1]
			}
		}
	}

	for (const line of lines) {
		if (!/electron/i.test(line)) continue

		const simpleMatch = line.match(/Electron[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
		if (simpleMatch?.[1]) {
			return simpleMatch[1]
		}
	}

	return undefined
}

export interface ElectronMetadata {
	chromium: string
	node: string
	v8: string
}

export async function getElectronMetadata(
	electronVersion: string
): Promise<ElectronMetadata | null> {
	const url = `https://releases.electronjs.org/release/v${electronVersion}`
	const res = await fetch(url, { cache: 'force-cache' })
	if (!res.ok) return null

	const html = await res.text()

	const chromiumMatch = html.match(
		/source\.chromium\.org\/chromium\/chromium\/src\/\+\/refs\/tags\/([0-9]+(?:\.[0-9]+)+):/
	)

	const nodeMatch = html.match(/github\.com\/nodejs\/node\/releases\/tag\/v([0-9]+(?:\.[0-9]+)+)/)

	const v8Match = html.match(
		/<title>V8<\/title>.*?<span[^>]*>V8<\/span><\/div><span[^>]*>([0-9]+(?:\.[0-9]+)+)<\/span>/
	)

	if (!chromiumMatch || !nodeMatch) return null

	return {
		chromium: chromiumMatch[1] ?? '',
		node: nodeMatch[1] ?? '',
		v8: v8Match?.[1] ?? '',
	}
}

export function parseChromiumVersionFromNotes(notes: string): string | undefined {
	const lines = notes.split(/\r?\n/).map(line => line.trim())

	let inDependencies = false

	for (const line of lines) {
		if (/^dependencies$/i.test(line)) {
			inDependencies = true
			continue
		}

		if (inDependencies) {
			if (!line) break

			const match = line.match(/Chromium[^0-9]*([0-9]+(?:\.[0-9]+){3})/i)
			if (match?.[1]) {
				return match[1]
			}
		}
	}

	for (const line of lines) {
		if (!/chromium/i.test(line)) continue

		const simpleMatch = line.match(/Chromium[^0-9]*([0-9]+(?:\.[0-9]+){3})/i)
		if (simpleMatch?.[1]) {
			return simpleMatch[1]
		}
	}

	return undefined
}

export function parseNodeJsVersionFromNotes(notes: string): string | undefined {
	const lines = notes.split(/\r?\n/).map(line => line.trim())

	let inDependencies = false

	for (const line of lines) {
		if (/^dependencies$/i.test(line)) {
			inDependencies = true
			continue
		}

		if (inDependencies) {
			if (!line) break

			const match = line.match(/Node\.?js[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
			if (match?.[1]) {
				return match[1]
			}
		}
	}

	for (const line of lines) {
		if (!/node/i.test(line)) continue

		const simpleMatch = line.match(/Node\.?js[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
		if (simpleMatch?.[1]) {
			return simpleMatch[1]
		}
	}

	return undefined
}

export function parseV8VersionFromNotes(notes: string): string | undefined {
	const lines = notes.split(/\r?\n/).map(line => line.trim())

	let inDependencies = false

	for (const line of lines) {
		if (/^dependencies$/i.test(line)) {
			inDependencies = true
			continue
		}

		if (inDependencies) {
			if (!line) break

			const match = line.match(/V8[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
			if (match?.[1]) {
				return match[1]
			}
		}
	}

	for (const line of lines) {
		if (!/v8/i.test(line)) continue

		const simpleMatch = line.match(/V8[^0-9]*([0-9]+(?:\.[0-9]+){2})/i)
		if (simpleMatch?.[1]) {
			return simpleMatch[1]
		}
	}

	return undefined
}

export function parseBuildTagFromNotes(notes: string): string | undefined {
	const lines = notes.split(/\r?\n/)

	for (const rawLine of lines) {
		const line = rawLine
			.trim()
			.replace(/^[-*+]\s*/, '')
			.replace(/\*\*/g, '')
			.replace(/\*/g, '')
			.replace(/__/g, '')
			.trim()

		if (!/tag:/i.test(line)) {
			continue
		}

		const match = line.match(/tag:\s*([a-z0-9\-_.]+)/i)

		if (match?.[1]) {
			return match[1].toLowerCase()
		}
	}

	if (lines.length > 0) {
		const firstLine = lines[0]?.trim()
		if (!firstLine) return

		if (/nightly/i.test(firstLine)) return 'nightly'
		if (/stable/i.test(firstLine)) return 'stable'
		if (/broken|failed|borked/i.test(firstLine)) return 'broken'
		if (/pre-?release/i.test(firstLine)) return 'pre-release'
		if (/alpha/i.test(firstLine)) return 'alpha'
		if (/beta/i.test(firstLine)) return 'beta'
	}

	return undefined
}

export interface WailsMetadata {
	go: string
	wails: string
}

export async function getWailsMetadata(tag: string, name: string): Promise<WailsMetadata | null> {
	const url = `https://raw.githubusercontent.com/Devollox/void-${name}/${encodeURIComponent(
		tag
	)}/go.mod`

	const res = await fetch(url, { cache: 'force-cache' })
	if (!res.ok) return null

	const content = await res.text()
	const lines = content.split(/\r?\n/)

	let goVersion: string | null = null
	let wailsVersion: string | null = null

	for (const line of lines) {
		const trimmed = line.trim()

		if (!goVersion && trimmed.startsWith('go ')) {
			const parts = trimmed.split(/\s+/)
			if (parts[1]) {
				goVersion = parts[1]
			}
		}

		if (!wailsVersion && trimmed.includes('github.com/wailsapp/wails/v2')) {
			const match = trimmed.match(/v([0-9]+(?:\.[0-9]+){1,2})/)
			if (match?.[1]) {
				wailsVersion = match[1]
			}
		}

		if (goVersion && wailsVersion) break
	}

	if (!goVersion && !wailsVersion) return null

	return {
		go: goVersion ?? '',
		wails: wailsVersion ?? '',
	}
}
