import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import { InfoBox } from '@components/status-info/info-box'
import type { Metadata } from 'next'
import styles from '../../docs/docs.module.scss'

export const metadata: Metadata = {
	title: 'Plugin Development',
	description: 'Learn how to create, publish and install Void Presence plugins.',
	openGraph: {
		title: 'Void Presence — Plugin Development',
		description:
			'Full guide on writing external plugins for Void Presence: API, controls, workers, native modules.',
		url: '/plugins/docs',
	},
}

export default function PluginDocsPage() {
	const left = (
		<>
			<InfoBox
				title='What is a plugin?'
				lines={[
					'A plugin is a single .js file or a folder placed in the Void Presence plugins directory. It exports a standard object and receives a PluginContext with settings, storage and logging.',
				]}
			/>
			<InfoBox
				variant='secondary'
				title='Browse existing plugins'
				lines={['See what the community has already built and install with one click.']}
				linkHref='/plugins'
				linkLabel='Go to plugins'
			/>
			<InfoBox
				variant='secondary'
				title='Submit your plugin'
				lines={['Open a PR to the void-web repository and add your plugin to the plugins/ folder.']}
				linkHref='https://github.com/Devollox/void-web/tree/main/plugins'
				linkLabel='GitHub → plugins/'
			/>
			<InfoBox
				variant='muted'
				lines={[
					'Plugins run in the Electron main process. Avoid blocking the event loop — use async/await or spawn a worker.js.',
				]}
			/>
		</>
	)

	const right = (
		<article className={styles.docs_content}>
			<section className={styles.docs_card}>
				<h3 className={styles.docs_title}>Minimal plugin</h3>
				<p className={styles.docs_text}>
					Drop a <code>.js</code> file into the <code>plugins/</code> folder inside your Void
					Presence userData directory. The app hot-loads it instantly — no restart required.
				</p>
				<pre className={styles.docs_code}>{`// my-plugin.js
module.exports = {
  id: 'my-plugin',          // unique id
  nameKey: 'My Plugin',     // display name
  version: '1.0.0',
  builtin: false,
  priority: 60,             // higher = takes over lower-priority plugins
  locked: false,
  controls: [],

  start(ctx) {
    // ctx.readSettings(), ctx.sendLog(), ctx.writeConfig(), etc.
  },

  stop() {},

  onUpdate(cb) {
    this._cb = cb
  },

  getPayload() {
    return {
      source: 'my-plugin',
      details: 'Hello from plugin',
      state:   'it works!',
      activityType: 'playing',
      priority: 60,
    }
  },
}`}</pre>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>VoidPlugin — all fields</h3>
				<p className={styles.docs_text}>
					Every plugin must export an object that satisfies the <code>VoidPlugin</code> interface.
					Below is a complete reference of every property and method.
				</p>
				<table className={styles.docs_table}>
					<thead>
						<tr>
							<th>Field</th>
							<th>Type</th>
							<th>Required</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>id</code>
							</td>
							<td>string</td>
							<td>✓</td>
							<td>
								Unique plugin identifier. Must be lowercase, no spaces. Used as storage key and in
								IPC messages. Conflicts with a builtin id are rejected at load time.
							</td>
						</tr>
						<tr>
							<td>
								<code>nameKey</code>
							</td>
							<td>string</td>
							<td>✓</td>
							<td>
								Human-readable display name shown on the plugin card. For external plugins this is a
								plain string, not a translation key.
							</td>
						</tr>
						<tr>
							<td>
								<code>version</code>
							</td>
							<td>string</td>
							<td>✓</td>
							<td>
								SemVer string, e.g. <code>'1.0.0'</code>. Shown in the UI and used for future
								upgrade detection.
							</td>
						</tr>
						<tr>
							<td>
								<code>builtin</code>
							</td>
							<td>boolean</td>
							<td>✓</td>
							<td>
								Always set to <code>false</code> for external plugins. The app overrides it to{' '}
								<code>false</code> during loading anyway, but it must be present.
							</td>
						</tr>
						<tr>
							<td>
								<code>priority</code>
							</td>
							<td>number</td>
							<td>✓</td>
							<td>
								Determines which plugin's payload is shown when multiple are active. Higher value
								wins. Built-in defaults: <code>default = 0</code>, <code>hardware = 50</code>,{' '}
								<code>smtc = 70</code>. Use a value above 70 to override everything. Can be changed
								at runtime from the UI.
							</td>
						</tr>
						<tr>
							<td>
								<code>locked</code>
							</td>
							<td>boolean?</td>
							<td>—</td>
							<td>
								When <code>true</code>, the plugin is always enabled and cannot be toggled off by
								the user. The <code>default</code> plugin uses this. Omit or set <code>false</code>{' '}
								for user-controllable plugins.
							</td>
						</tr>
						<tr>
							<td>
								<code>exclusive</code>
							</td>
							<td>boolean?</td>
							<td>—</td>
							<td>
								When <code>true</code>, if this plugin returns a non-null payload it completely
								blocks all lower-priority plugins — they are not evaluated at all. The{' '}
								<code>hardware</code> plugin uses this so hardware stats can't be mixed with default
								presence. Omit for normal (non-exclusive) behaviour.
							</td>
						</tr>
						<tr>
							<td>
								<code>waitForWorker</code>
							</td>
							<td>boolean?</td>
							<td>—</td>
							<td>
								Hint for the app: do not send the first presence update until the plugin has
								received at least one message from its worker thread. The <code>hardware</code>{' '}
								plugin uses this to avoid showing an empty card on startup. Optional.
							</td>
						</tr>
						<tr>
							<td>
								<code>controls</code>
							</td>
							<td>PluginControl[]</td>
							<td>✓</td>
							<td>
								Array of UI controls rendered on the plugin card. Use <code>[]</code> if your plugin
								has no configurable options. See the Controls section below for all control types.
							</td>
						</tr>
						<tr>
							<td>
								<code>start(ctx)</code>
							</td>
							<td>Promise&lt;void&gt; | void</td>
							<td>✓</td>
							<td>
								Called when the plugin is enabled. Receive a <code>PluginContext</code> for
								settings, storage and logging. Start timers, workers, or file watchers here.
							</td>
						</tr>
						<tr>
							<td>
								<code>stop()</code>
							</td>
							<td>Promise&lt;void&gt; | void</td>
							<td>✓</td>
							<td>
								Called when the plugin is disabled or the app shuts down. Clean up all timers,
								workers, and listeners to avoid memory leaks.
							</td>
						</tr>
						<tr>
							<td>
								<code>onUpdate(cb)</code>
							</td>
							<td>void</td>
							<td>✓</td>
							<td>
								The app passes a throttled callback here. Call it whenever your payload changes so
								the app re-reads <code>getPayload()</code> and pushes the update to Discord.
							</td>
						</tr>
						<tr>
							<td>
								<code>onConfigChanged?(key)</code>
							</td>
							<td>void</td>
							<td>—</td>
							<td>
								Optional. Called by the app when a shared config file changes (e.g.{' '}
								<code>'buttons'</code>,<code>'imageCycles'</code>, <code>'cycles'</code>,{' '}
								<code>'party'</code>). Use it to reset cycle indices and refresh your payload so
								changes take effect immediately without a restart.
							</td>
						</tr>
						<tr>
							<td>
								<code>getPayload()</code>
							</td>
							<td>PresencePayload | null</td>
							<td>✓</td>
							<td>
								Return the current payload to show in Discord, or <code>null</code> if the plugin
								has nothing to display right now. When <code>null</code>, the next lower-priority
								active plugin takes over.
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>PluginInfo — what the UI receives</h3>
				<p className={styles.docs_text}>
					The main process serialises each registered plugin into a <code>PluginInfo</code> object
					and sends it to the renderer via <code>plugin:list-updated</code>. This is the shape the
					Plugins page works with — not the full <code>VoidPlugin</code>.
				</p>
				<table className={styles.docs_table}>
					<thead>
						<tr>
							<th>Field</th>
							<th>Type</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>id</code>
							</td>
							<td>string</td>
							<td>
								Plugin identifier, same as <code>VoidPlugin.id</code>.
							</td>
						</tr>
						<tr>
							<td>
								<code>nameKey</code>
							</td>
							<td>string</td>
							<td>Display name passed through from the plugin object.</td>
						</tr>
						<tr>
							<td>
								<code>version</code>
							</td>
							<td>string</td>
							<td>SemVer version string.</td>
						</tr>
						<tr>
							<td>
								<code>builtin</code>
							</td>
							<td>boolean</td>
							<td>
								<code>true</code> for shipped plugins, <code>false</code> for anything loaded from
								the <code>plugins/</code> folder.
							</td>
						</tr>
						<tr>
							<td>
								<code>priority</code>
							</td>
							<td>number</td>
							<td>
								Current priority. Can be edited by the user in the UI; the app calls{' '}
								<code>setPluginPriority(id, value)</code> to persist it.
							</td>
						</tr>
						<tr>
							<td>
								<code>locked</code>
							</td>
							<td>boolean</td>
							<td>Whether the enable toggle is disabled in the UI.</td>
						</tr>
						<tr>
							<td>
								<code>enabled</code>
							</td>
							<td>boolean</td>
							<td>
								Current runtime enabled state from the in-memory <code>enabledState</code> map. Not
								persisted for builtin plugins — they re-evaluate from settings on next launch.
							</td>
						</tr>
						<tr>
							<td>
								<code>exclusive</code>
							</td>
							<td>boolean</td>
							<td>
								Shown as a badge in the UI to indicate this plugin blocks lower-priority ones when
								active.
							</td>
						</tr>
						<tr>
							<td>
								<code>controls</code>
							</td>
							<td>PluginControl[]</td>
							<td>
								Passed verbatim so the renderer can render the correct control widgets without
								knowing the plugin internals.
							</td>
						</tr>
					</tbody>
				</table>
				<p className={styles.docs_text}>
					External plugin enabled state is persisted separately in{' '}
					<code>external-plugins-state.json</code> inside userData and read back on the next{' '}
					<code>startAll()</code> call.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>PresencePayload fields</h3>
				<p className={styles.docs_text}>
					Return this object from <code>getPayload()</code>. Return <code>null</code> when the
					plugin has nothing to show — a lower-priority plugin will take over.
				</p>
				<table className={styles.docs_table}>
					<thead>
						<tr>
							<th>Field</th>
							<th>Type</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>source</code>
							</td>
							<td>string</td>
							<td>Plugin identifier, shown in logs</td>
						</tr>
						<tr>
							<td>
								<code>details</code>
							</td>
							<td>string</td>
							<td>Top text line in Discord</td>
						</tr>
						<tr>
							<td>
								<code>state</code>
							</td>
							<td>string</td>
							<td>Second text line</td>
						</tr>
						<tr>
							<td>
								<code>activityType</code>
							</td>
							<td>'playing' | 'streaming' | 'listening' | 'watching' | 'competing'</td>
							<td>Activity verb shown above the card</td>
						</tr>
						<tr>
							<td>
								<code>priority</code>
							</td>
							<td>number</td>
							<td>Higher wins. Builtin default = 0, hardware = 50</td>
						</tr>
						<tr>
							<td>
								<code>assets</code>
							</td>
							<td>object?</td>
							<td>large_image, large_text, small_image, small_text</td>
						</tr>
						<tr>
							<td>
								<code>buttons</code>
							</td>
							<td>{'{ label, url }[]'}?</td>
							<td>Up to 2 Discord buttons</td>
						</tr>
						<tr>
							<td>
								<code>party</code>
							</td>
							<td>{'{ size: [current, max] }'}?</td>
							<td>Party size indicator</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>PluginContext API</h3>
				<p className={styles.docs_text}>
					The <code>ctx</code> object passed to <code>start(ctx)</code> gives you access to app
					internals:
				</p>
				<table className={styles.docs_table}>
					<thead>
						<tr>
							<th>Method / Property</th>
							<th>Returns</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>ctx.readSettings()</code>
							</td>
							<td>Promise&lt;Settings&gt;</td>
							<td>Full app settings (clientId, intervals, toggles…)</td>
						</tr>
						<tr>
							<td>
								<code>ctx.readFiltersState()</code>
							</td>
							<td>Promise&lt;ConfigState&gt;</td>
							<td>Active filters state (musicFilter, hardwareMonitorEnabled…)</td>
						</tr>
						<tr>
							<td>
								<code>ctx.readConfig(name)</code>
							</td>
							<td>Promise&lt;object | null&gt;</td>
							<td>
								Read a JSON config. Checks plugin-private storage first, then shared userData
								(buttons, imageCycles, etc.)
							</td>
						</tr>
						<tr>
							<td>
								<code>ctx.writeConfig(name, data)</code>
							</td>
							<td>Promise&lt;void&gt;</td>
							<td>
								Write JSON to{' '}
								<code>
									plugins-data/{'{pluginId}'}/{'{name}'}.json
								</code>
							</td>
						</tr>
						<tr>
							<td>
								<code>ctx.sendLog(msg, level?)</code>
							</td>
							<td>void</td>
							<td>
								Send a message to the in-app log. Levels: 'info' | 'warn' | 'error' | 'success'
							</td>
						</tr>
						<tr>
							<td>
								<code>ctx.userDataPath</code>
							</td>
							<td>string</td>
							<td>Absolute path to Electron userData directory</td>
						</tr>
						<tr>
							<td>
								<code>ctx.pluginDir</code>
							</td>
							<td>string | null</td>
							<td>Absolute path to this plugin's folder (null for single-file plugins)</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Shared config files — readConfig reference</h3>
				<p className={styles.docs_text}>
					<code>ctx.readConfig(name)</code> first looks for{' '}
					<code>plugins-data/{'{pluginId}/{name}'}.json</code>, then falls back to the root userData
					directory. This means you can read the user's own app config from any plugin — useful for
					reusing images, buttons, and activity type the user already set up.
				</p>
				<p className={styles.docs_text}>
					All files live in the Electron <strong>userData</strong> directory (
					<code>ctx.userDataPath</code>). Below are all shared files you can read:
				</p>
				<table className={styles.docs_table}>
					<thead>
						<tr>
							<th>name argument</th>
							<th>File on disk</th>
							<th>Shape</th>
							<th>Notes</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>'image-cycles'</code>
							</td>
							<td>
								<code>image-cycles.json</code>
							</td>
							<td>
								<code>{'{ cycles: [{ largeImage, largeText, smallImage, smallText }] }'}</code>
							</td>
							<td>
								Images the user configured on the Config page. Each entry is one slide. Any field
								can be <code>null</code>.
							</td>
						</tr>
						<tr>
							<td>
								<code>'buttons-config'</code>
							</td>
							<td>
								<code>buttons-config.json</code>
							</td>
							<td>
								<code>{'{ pairs: [{ label1, url1, label2?, url2? }] }'}</code>
							</td>
							<td>
								Button pairs. Each pair can have 1–2 buttons. Discord allows max 2 buttons total per
								activity.
							</td>
						</tr>
						<tr>
							<td>
								<code>'cycles-config'</code>
							</td>
							<td>
								<code>cycles-config.json</code>
							</td>
							<td>
								<code>{'{ entries: [{ details: string, state: string }] }'}</code>
							</td>
							<td>
								The user's custom presence text slides used by the default plugin. Read-only from
								external plugins.
							</td>
						</tr>
						<tr>
							<td>
								<code>'activity-type'</code>
							</td>
							<td>
								<code>activity-type.json</code>
							</td>
							<td>
								<code>{"{ type: 'playing' | 'watching' | 'listening' | 'competing' }"}</code>
							</td>
							<td>
								The activity verb shown above the Discord card. Defaults to <code>'playing'</code>.
							</td>
						</tr>
						<tr>
							<td>
								<code>'timer-config'</code>
							</td>
							<td>
								<code>timer-config.json</code>
							</td>
							<td>
								<code>
									{'{ updateIntervalSec: number | null, updateIntervalSecStatus: number | null }'}
								</code>
							</td>
							<td>
								Global update interval in seconds. Min value enforced: 5. Use this to respect the
								user's refresh rate setting instead of hardcoding your own.
							</td>
						</tr>
						<tr>
							<td>
								<code>'party-config'</code>
							</td>
							<td>
								<code>party-config.json</code>
							</td>
							<td>
								<code>
									{'{ entries: [{ sizeCurrent: number | null, sizeMax: number | null }] }'}
								</code>
							</td>
							<td>
								Party size cycles. Only valid when both values are finite and{' '}
								<code>sizeCurrent &gt; 0</code>.
							</td>
						</tr>
						<tr>
							<td>
								<code>'timestamp-config'</code>
							</td>
							<td>
								<code>timestamp-config.json</code>
							</td>
							<td>
								<code>{'{ mode, rangeMin, rangeMax, persistOffsetSec, nowMode, timeCycles }'}</code>
							</td>
							<td>
								Timestamp display mode set by the user. Mostly relevant to the default plugin.
							</td>
						</tr>
						<tr>
							<td>
								<code>'settings'</code>
							</td>
							<td>
								<code>settings.json</code>
							</td>
							<td>
								See <code>ctx.readSettings()</code>
							</td>
							<td>
								Use <code>ctx.readSettings()</code> instead — it has built-in validation and
								defaults.
							</td>
						</tr>
					</tbody>
				</table>
				<p className={styles.docs_text}>
					Example — read the user's image cycles and activity type in your plugin:
				</p>
				<pre className={styles.docs_code}>{`async start(ctx) {
  // Read shared image cycles
  const imgCfg = await ctx.readConfig('image-cycles')
  const cycles = imgCfg?.cycles ?? []
  const img = cycles[0] ?? {}

  // Read the activity type the user chose globally
  const typeCfg = await ctx.readConfig('activity-type')
  const activityType = typeCfg?.type ?? 'playing'

  // Read the global update interval
  const timerCfg = await ctx.readConfig('timer-config')
  const intervalMs = ((timerCfg?.updateIntervalSec ?? 30) * 1000)

  this._payload = {
    source: 'my-plugin',
    details: 'Hello',
    state: 'world',
    activityType,
    assets: {
      large_image: img.largeImage ?? undefined,
      large_text:  img.largeText  ?? undefined,
    },
    priority: 60,
  }
}`}</pre>
				<p className={styles.docs_text}>
					<strong>Write your own config</strong> with <code>ctx.writeConfig(name, data)</code> — it
					saves to <code>plugins-data/{'{pluginId}/{name}'}.json</code> and never touches shared
					files. Use it to persist plugin-specific settings like API tokens or user preferences.
				</p>
				<pre className={styles.docs_code}>{`// Save
await ctx.writeConfig('my-state', { apiToken: 'abc123', lastFetch: Date.now() })

// Read back (reads plugin-private storage first)
const state = await ctx.readConfig('my-state')
const token = state?.apiToken ?? ''`}</pre>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Plugin controls</h3>
				<p className={styles.docs_text}>
					Controls are rendered automatically on the plugin card in the Plugins page. Three types
					are supported:
				</p>
				<pre className={styles.docs_code}>{`controls: [
  // Toggle — wired to an IPC method
  {
    type: 'toggle',
    id: 'my-toggle',
    labelKey: 'Enable feature',
    hintKey:  'Turns the feature on or off',
    storageKey: 'myFeatureEnabled',   // localStorage key
    ipcMethod:  'setMyFeature',       // window.electronAPI method name
    defaultValue: false,
  },

  // Select — renders a button group
  {
    type: 'select',
    id: 'my-mode',
    labelKey: 'Mode',
    storageKey: 'myMode',
    ipcMethod:  'setMyMode',
    defaultValue: 'fast',
    options: [
      { value: 'fast',   labelKey: 'Fast'   },
      { value: 'normal', labelKey: 'Normal' },
      { value: 'slow',   labelKey: 'Slow'   },
    ],
  },

  // Input — text field, auto-saved after 600 ms
  {
    type: 'input',
    id: 'my-token',
    labelKey:   'API token',
    hintKey:    'Your secret token',
    storageKey: 'myToken',
    placeholder: 'paste token here',
    defaultValue: '',
  },
]`}</pre>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Folder plugin + worker.js</h3>
				<p className={styles.docs_text}>
					For CPU-intensive tasks, ship a <code>worker.js</code> in the same folder. The app detects
					it via <code>ctx.pluginDir</code> and runs it in a Worker thread. The worker communicates
					via <code>parentPort.postMessage</code>.
				</p>
				<pre className={styles.docs_code}>{`// my-plugin/index.js
const { Worker } = require('worker_threads')
const path = require('path')

let _worker = null
let _updateCb = null
let _payload = null

module.exports = {
  id: 'my-plugin',
  // ...

  start(ctx) {
    const workerPath = path.join(ctx.pluginDir, 'worker.js')
    _worker = new Worker(workerPath)
    _worker.on('message', msg => {
      if (msg.type === 'result') {
        _payload = { details: msg.value, priority: 60 }
        _updateCb?.()
      }
    })
  },

  stop() { _worker?.terminate(); _worker = null },
  onUpdate(cb) { _updateCb = cb },
  getPayload() { return _payload },
}

// my-plugin/worker.js
const { parentPort } = require('worker_threads')

setInterval(() => {
  parentPort.postMessage({ type: 'result', value: 'data from worker' })
}, 5000)`}</pre>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Native npm modules</h3>
				<p className={styles.docs_text}>
					Add a <code>package.json</code> to your plugin folder. The app runs{' '}
					<code>npm install</code> automatically. If native <code>.node</code> files are detected,
					it runs <code>electron-rebuild</code> to recompile them against the correct Electron ABI.
				</p>
				<pre className={styles.docs_code}>{`// my-plugin/package.json
{
  "name": "my-void-plugin",
  "version": "1.0.0",
  "dependencies": {
    "some-native-module": "1.2.3"
  }
}`}</pre>
				<p className={styles.docs_text}>
					A <code>.rebuilt</code> marker file is created after a successful rebuild so it only
					happens once. Delete it to force a rebuild.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>manifest.json (for publishing)</h3>
				<p className={styles.docs_text}>
					Add a <code>manifest.json</code> to your folder plugin so the auto-manifest script can
					pick up your metadata without evaluating your code:
				</p>
				<pre className={styles.docs_code}>{`// my-plugin/manifest.json
{
  "id": "my-plugin",
  "title": "My Plugin",
  "description": "What it does",
  "author": "YourGitHubUsername",
  "version": "1.0.0",
  "tags": ["tag1", "tag2"],
  "preview": {
    "activityType": "playing",
    "slides": [
      "First preview line",
      "Second preview line",
      "Third preview line"
    ]
  }
}`}</pre>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>How the active plugin is chosen</h3>
				<p className={styles.docs_text}>
					Every tick the engine picks exactly one plugin to show in Discord. The algorithm runs in
					two passes over all <strong>enabled</strong> plugins sorted by <code>priority</code>{' '}
					descending:
				</p>
				<pre className={styles.docs_code}>{`Pass 1 — exclusive plugins only
  for each plugin (highest priority first):
    if plugin.exclusive && plugin.getPayload() !== null
      → use this payload, stop

Pass 2 — all plugins
  for each plugin (highest priority first):
    if plugin.getPayload() !== null
      → use this payload, stop

If nothing returned a payload → Discord presence is cleared`}</pre>
				<p className={styles.docs_text}>Practical rules:</p>
				<ul className={styles.docs_list}>
					<li className={styles.docs_list_item}>
						Set <code>priority</code> higher than the plugin you want to override. Builtin values:
						<code> default = 0</code>, <code>hardware = 50</code>, <code>smtc = 70</code>. Use{' '}
						<code>75+</code> to beat everything.
					</li>
					<li className={styles.docs_list_item}>
						Return <code>null</code> from <code>getPayload()</code> when your plugin has nothing to
						show — the engine falls through to the next one automatically.
					</li>
					<li className={styles.docs_list_item}>
						<code>exclusive: true</code> means your plugin blocks pass 2 entirely if it returns a
						payload. Only use it if you want to prevent any fallback (like hardware does).
					</li>
					<li className={styles.docs_list_item}>
						Priority can be changed by the user at runtime from the Plugins page — do not assume
						your initial value is permanent.
					</li>
				</ul>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Hot-reload behaviour</h3>
				<p className={styles.docs_text}>
					The app watches the <code>plugins/</code> directory with <code>fs.watch</code>. When a
					file or folder changes:
				</p>
				<ul className={styles.docs_list}>
					<li className={styles.docs_list_item}>
						<strong>File added or changed</strong> — the old instance is stopped and unregistered,
						the new file is <code>require()</code>d fresh (cache is cleared). If loading succeeds
						the plugin is registered and a toast appears.
					</li>
					<li className={styles.docs_list_item}>
						<strong>File removed</strong> — the plugin is stopped, unregistered, and removed from
						the UI. No restart needed.
					</li>
					<li className={styles.docs_list_item}>
						<strong>Load error</strong> — the error is logged, the plugin stays unregistered. The
						previously running version is already gone. Fix the file and save again to retry.
					</li>
					<li className={styles.docs_list_item}>
						Changes are debounced by 500 ms to handle editors that write files in multiple steps.
					</li>
					<li className={styles.docs_list_item}>
						If a folder plugin has a <code>package.json</code> without <code>node_modules/</code>,{' '}
						<code>npm install</code> runs automatically before loading. This can take a few seconds
						on first install — the Logs view opens automatically so you can see progress.
					</li>
				</ul>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Install deep link</h3>
				<p className={styles.docs_text}>
					Plugins can be installed directly from a URL via the custom protocol. The app handles the
					link, downloads the file or folder, and hot-loads it — no manual file copying needed.
				</p>
				<pre className={styles.docs_code}>{`# Single .js file
voidpresence://install-plugin?url=https://raw.githubusercontent.com/you/repo/main/plugins/my-plugin.js

# Folder plugin (GitHub tree URL — app uses GitHub API to download all files)
voidpresence://install-plugin?url=https://github.com/you/repo/tree/main/plugins/my-plugin`}</pre>
				<p className={styles.docs_text}>
					The Plugins page on this site generates these links automatically from{' '}
					<code>plugins-manifest.json</code>. If you publish via PR, the install button appears for
					free once your plugin is merged.
				</p>
				<p className={styles.docs_text}>
					For folder plugins the app calls the GitHub Contents API to walk the directory tree and
					download every file individually. The folder is saved to{' '}
					<code>userData/plugins/{'{pluginId}'}/</code>. Existing <code>node_modules/</code> and{' '}
					<code>.rebuilt</code> are preserved across reinstalls if the folder already exists.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Input controls and storage</h3>
				<p className={styles.docs_text}>
					<code>input</code> controls are the{' '}
					<strong>only control type that works reliably for external plugins</strong>. When the user
					types, the renderer saves the value automatically via <code>plugins:set-storage</code> IPC
					after a 600 ms debounce — no extra wiring needed.
				</p>
				<p className={styles.docs_text}>
					<code>toggle</code> and <code>select</code> controls call{' '}
					<code>window.electronAPI[ipcMethod](value)</code> directly. For that to work the method
					must be registered in the app's <code>ElectronAPI</code>. Builtin plugins have their
					methods registered (e.g. <code>setHardwareMonitor</code>, <code>setBarStyleConfig</code>
					). External plugins have no way to register new IPC handlers, so{' '}
					<strong>toggle and select will render but clicking them will silently do nothing</strong>.
					Use <code>input</code> for all user-facing settings in external plugins.
				</p>
				<p className={styles.docs_text}>
					Values are stored in <code>userData/plugin-{'{pluginId}'}-state.json</code> under the{' '}
					<code>storageKey</code> you specified. Read it back in your plugin like this:
				</p>
				<pre className={styles.docs_code}>{`// In start(ctx) or in your poll function:
const fs = require('fs')
const path = require('path')

function readState(ctx, key, fallback = '') {
  try {
    const file = path.join(ctx.userDataPath, \`plugin-\${module.exports.id}-state.json\`)
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return data[key] ?? fallback
  } catch {
    return fallback
  }
}

// Usage
const token = readState(ctx, 'myToken', '')
const url   = readState(ctx, 'steamUrl', 'https://steamcommunity.com/id/me')`}</pre>
				<p className={styles.docs_text}>
					Alternatively use <code>ctx.readConfig(name)</code> which does the same lookup
					asynchronously and is already built into the context.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Limitations and gotchas</h3>
				<ul className={styles.docs_list}>
					<li className={styles.docs_list_item}>
						<strong>No native modules in single-file plugins.</strong> A bare <code>.js</code> file
						cannot have a <code>node_modules/</code> next to it — the watcher only processes one
						file. To use npm packages, use a folder plugin with <code>package.json</code>.
					</li>
					<li className={styles.docs_list_item}>
						<strong>id must not conflict with builtins.</strong> The reserved ids are{' '}
						<code>default</code>, <code>smtc</code>, <code>hardware</code>. Plugins with these ids
						are rejected at load time with a warning in the log.
					</li>
					<li className={styles.docs_list_item}>
						<strong>Plugins run in the main process.</strong> A crash or infinite loop in your
						plugin can hang the entire app. Use <code>try/catch</code> around all async operations
						and offload heavy work to a <code>worker.js</code>.
					</li>
					<li className={styles.docs_list_item}>
						<strong>Do not block the event loop.</strong> Synchronous CPU work longer than ~50 ms
						will stutter the UI. Use <code>async/await</code>, <code>setTimeout</code>, or a Worker
						thread.
					</li>
					<li className={styles.docs_list_item}>
						<strong>
							Always implement <code>stop()</code> properly.
						</strong>{' '}
						Timers and workers that are not cleaned up keep running after the plugin is disabled and
						cause double-update bugs. Set every handle to <code>null</code> after clearing it.
					</li>
					<li className={styles.docs_list_item}>
						<strong>
							<code>onConfigChanged</code> keys are limited.
						</strong>{' '}
						The app only notifies on three keys: <code>'imageCycles'</code>, <code>'buttons'</code>,{' '}
						<code>'cycles'</code>. Changes to other shared configs (timer, party, activity type) are
						not notified — read them fresh on each tick instead.
					</li>
					<li className={styles.docs_list_item}>
						<strong>toggle and select controls don't work in external plugins.</strong> They render
						correctly but clicking them calls <code>window.electronAPI[ipcMethod]</code> which only
						exists for builtin-registered methods. For external plugins use <code>input</code> for
						all settings — it's the only type with a universal IPC handler (
						<code>plugins:set-storage</code>).
					</li>
					<li className={styles.docs_list_item}>
						<strong>Discord limits on payload fields.</strong> <code>details</code> and{' '}
						<code>state</code> max 128 characters each. Buttons max 2, button label max 32
						characters, URL must start with <code>https://</code>. Exceeding limits silently
						truncates or drops the field.
					</li>
					<li className={styles.docs_list_item}>
						<strong>
							Hot-reload clears <code>require</code> cache.
						</strong>{' '}
						On each hot-reload all module-level variables are reset to their initial values. If you
						persist state only in memory it will be lost on every save. Use{' '}
						<code>ctx.writeConfig</code> or the state file to survive reloads.
					</li>
					<li className={styles.docs_list_item}>
						<strong>electron-rebuild runs only once per folder.</strong> A <code>.rebuilt</code>{' '}
						marker file prevents redundant rebuilds. If you update a native dependency version,
						delete <code>.rebuilt</code> manually to force a rebuild.
					</li>
				</ul>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Publishing your plugin</h3>
				<ol className={styles.docs_list_ordered}>
					<li className={styles.docs_list_item}>
						Add <code>author</code>, <code>description</code>, <code>tags</code> and{' '}
						<code>preview.slides</code> to your <code>module.exports</code> (or to{' '}
						<code>manifest.json</code> for folder plugins).
					</li>
					<li className={styles.docs_list_item}>
						Open a pull request to{' '}
						<a
							style={{ color: 'white' }}
							href='https://github.com/Devollox/void-web'
							target='_blank'
							rel='noopener noreferrer'
						>
							github.com/Devollox/void-web
						</a>{' '}
						and place your <code>.js</code> file or folder inside <code>plugins/</code>.
					</li>
					<li className={styles.docs_list_item}>
						After merge, run <code>npm run build:manifest</code> — it auto-generates{' '}
						<code>plugins-manifest.json</code> from your source, including slides and metadata.
					</li>
					<li className={styles.docs_list_item}>
						Your plugin appears on the Plugins page and can be installed with one click via the deep
						link <code>voidpresence://install-plugin?url=…</code>.
					</li>
				</ol>
			</section>
		</article>
	)

	return (
		<Page>
			<PageHeader
				title='Plugin Development'
				subtitle='Build and publish external plugins for Void Presence.'
			/>
			<PanelLayout left={left} right={right} />
		</Page>
	)
}
