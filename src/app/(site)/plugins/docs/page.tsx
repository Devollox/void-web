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
