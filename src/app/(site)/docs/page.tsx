import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PanelLayout } from '@components/panel-layout'
import { InfoBox } from '@components/status-info/info-box'
import type { Metadata } from 'next'
import RpcPreviewClient from '../download/rpc-preview-client'
import styles from './docs.module.scss'

export const metadata: Metadata = {
	title: 'Docs',
	description:
		'Void Presence documentation: learn how to install, configure, and debug your Discord Rich Presence.',
	openGraph: {
		title: 'Void Presence - Docs',
		description:
			'Read the full Void Presence documentation including features, setup steps, and usage tips.',
		url: '/docs',
	},
}

const config = {
	cycles: [
		{
			details: 'DETAILS',
			state: 'STATE',
		},
	],
	imageCycles: [
		{
			largeImage:
				'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGE0ZXVvY3QwbmkyN2Vkbmg3ZHo1OXZkcW13OXU4aHphaWpvbndiNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PkKzNQjwPy7GvxZbfe/giphy.gif',
			largeText: 'largeText',
		},
	],
	buttonPairs: [
		{
			label1: 'BUTTON 1',
			url1: 'https',
			label2: 'BUTTON 2',
			url2: 'https',
		},
	],
}

export default function DocsPage() {
	const left = (
		<>
			<InfoBox
				title='Getting started'
				lines={[
					'Install the desktop client, create a Discord application, then configure your first Rich Presence profile in the main window.',
				]}
			/>
			<InfoBox
				variant='secondary'
				title='Need the app?'
				lines={[
					'Download the latest Void Presence build on the download page and follow this guide to configure it.',
				]}
				linkHref='/download'
				linkLabel='Go to download page'
			/>
			<InfoBox
				variant='secondary'
				title='Where are my configs?'
				lines={['You can find all your saved configurations right here in your profile.']}
				linkHref='/profile'
				linkLabel='View my configs'
			/>
			<InfoBox
				variant='muted'
				lines={[
					'If buttons or images are missing in Discord, open the status page to check setup, RPC connection and common issues.',
				]}
				linkHref='/status'
				linkLabel='Read setup & troubleshooting'
			/>
		</>
	)

	const right = (
		<article className={styles.docs_content}>
			<section className={styles.docs_card}>
				<h3 className={styles.docs_title}>Overview</h3>
				<p className={styles.docs_text}>
					Void Presence is an advanced Discord Rich Presence manager with customizable button pairs,
					text cycles, image rotation and profile management via drag and drop.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Quick usage</h3>

				<div className={styles.quick_shell}>
					<div className={styles.quick_top}>
						<div className={styles.quick_status_chip}>
							<span className={styles.quick_status_dot} />
							<span>ACTIVE SESSION</span>
						</div>
						<div className={styles.quick_activity_title}>
							<span className={styles.quick_activity_main}>Idle</span>
							<span className={styles.quick_activity_sub}>Waiting for Discord</span>
						</div>
					</div>

					<div className={styles.quick_row}>
						<span className={styles.quick_label}>client id</span>
						<input
							className={styles.quick_input}
							placeholder='Application ID'
							readOnly
							value='123456789012345678'
						/>
						<button className={styles.quick_btn}>save</button>
					</div>

					<div className={styles.quick_row}>
						<span className={styles.quick_label}>update(sec)</span>
						<input className={styles.quick_input} placeholder='30' readOnly />
					</div>

					<div className={styles.quick_blocks}>
						<div className={styles.quick_block}>
							<div className={styles.quick_block_header}>
								<span className={styles.quick_block_label}>Details &amp; State</span>
								<button className={styles.quick_block_add}>+ DETAILS &amp; STATE</button>
							</div>
							<div className={styles.quick_block_hint}>left column · text rows</div>
						</div>

						<div className={styles.quick_block}>
							<div className={styles.quick_block_header}>
								<span className={styles.quick_block_label}>images</span>
								<button className={styles.quick_block_add}>+ image</button>
							</div>
							<div className={styles.quick_block_hint}>
								center/right · large / small keys (small image and hover text are optional)
							</div>
						</div>

						<div className={styles.quick_block}>
							<div className={styles.quick_block_header}>
								<span className={styles.quick_block_label}>button pairs</span>
								<button className={styles.quick_block_add}>+ pair</button>
							</div>
							<div className={styles.quick_block_hint}>bottom block · button 1 / button 2</div>
						</div>
					</div>
				</div>

				<ol className={styles.docs_list_ordered}>
					<li className={styles.docs_list_item}>
						Open Discord desktop and keep it running. In Void Presence, the status chip at the top
						of the main card (same as in the mini preview above) will switch from “Waiting for
						Discord” once the RPC connection is ready.
					</li>
					<li className={styles.docs_list_item}>
						In the{' '}
						<a
							style={{ color: 'white', textDecoration: 'underline' }}
							href='https://discord.com/developers/applications'
							target='_blank'
							rel='noreferrer'
						>
							Discord Developer Portal
						</a>
						, <span className={styles.docs_code_text}>New Application</span>, give it a name and
						choose an <span className={styles.docs_code_text}>App icon</span>. This icon will be
						used as the avatar of your activity when you are in a Discord voice or text channel.
					</li>
					<li className={styles.docs_list_item}>
						On the application page, copy the{' '}
						<span className={styles.docs_code_text}>APPLICATION ID</span> and paste it into the
						rounded <span className={styles.docs_code_text}>client id</span> field at the top of the
						main card in Void Presence (see the first row in the preview). Then click the{' '}
						<span className={styles.docs_code_text}>save</span> button on the right of this row.
					</li>
					<li className={styles.docs_list_item}>
						In the row below, set <span className={styles.docs_code_text}>update(sec)</span> – this
						is how often Void Presence will move to the next entry in your cycles (for example, 30
						seconds for a slow rotation).
					</li>
					<li className={styles.docs_list_item}>
						In the <span className={styles.docs_code_text}>Details &amp; State</span> block on the
						left side of the main card (first small block in the preview), click{' '}
						<span className={styles.docs_code_text}>+ DETAILS &amp; STATE</span>. In each new row
						that appears, type the top line into the first pill input (Details) and the second line
						into the lower pill input (State).
					</li>
					<li className={styles.docs_list_item}>
						In the <span className={styles.docs_code_text}>images</span> block (middle block in the
						preview), click <span className={styles.docs_code_text}>+ image</span>. For each row,
						fill the large image key, and optionally the small image key and hover texts – these
						fields can be left empty if you only need one image without captions.
					</li>
					<li className={styles.docs_list_item}>
						In the <span className={styles.docs_code_text}>button pairs</span> block (bottom block
						in the preview), click <span className={styles.docs_code_text}>+ pair</span>. In each
						row, type the label and HTTPS URL for Button 1 and optionally Button 2; if Button 2 is
						empty, only the first button will appear in Discord.
					</li>
					<li className={styles.docs_list_item}>
						When all fields are filled, click the{' '}
						<span className={styles.docs_code_text}>Save and Restart Presence</span> button under
						the main card in the app to apply your configuration. The current payload panel at the
						bottom of the window will show exactly what is being sent to Discord.
					</li>
				</ol>

				<p className={styles.docs_text}>
					Click <span className={styles.docs_code_text}>Save and Restart Presence</span> after each
					change – the app will automatically save your configuration and restart the active Rich
					Presence session with the updated details, images and buttons.
				</p>

				<div className={styles.rpc_preview_section}>
					<div className={styles.rpc_card_preview}>
						<RpcPreviewClient activityType='YOUR APP NAME' config={config} />
					</div>
					<div className={styles.preview_label}>
						<span>YOUR APP NAME from Discord Developer Portal</span>
					</div>
					<div className={styles.preview_legend}>
						<div>
							<span className={styles.legend_key}>details</span> - main line (from Details input)
						</div>
						<div>
							<span className={styles.legend_key}>state</span> - subtitle (from State input)
						</div>
						<div>
							<span className={styles.legend_key}>largeImage</span> - main artwork (from Images
							block)
						</div>
						<div>
							<span className={styles.legend_key}>buttons</span> - clickable links (from Button
							pairs)
						</div>
					</div>
				</div>

				<p className={styles.docs_text}>
					<strong>App icon is important:</strong> This icon appears as your activity avatar when
					you're in Discord voice/text channels. Upload a 512x512 PNG with transparent background
					for best results.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>How cycles work</h3>
				<p className={styles.docs_text}>
					Internally, each list (text, images, buttons) is an ordered array of rows. On every tick,
					Void Presence moves an index forward and uses the row at that position for the next Rich
					Presence update.
				</p>
				<ul className={styles.docs_list}>
					<li className={styles.docs_list_item}>
						Text cycle – rows from the Details &amp; State list are used for the main and secondary
						lines in Discord.
					</li>
					<li className={styles.docs_list_item}>
						Image cycle – rows from the images list control large/small image keys and their hover
						texts.
					</li>
					<li className={styles.docs_list_item}>
						Button cycle – rows from the button pairs list control the two clickable buttons;
						missing second button is simply ignored.
					</li>
					<li className={styles.docs_list_item}>
						If a list has only one row, the same values repeat on every step while other lists still
						rotate through their own rows.
					</li>
				</ul>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Cycles UI demo</h3>
				<p className={styles.docs_text}>
					This example mirrors the Details &amp; State section in the desktop app: a label row, a
					rounded “+ Details &amp; State” button and a vertical list of draggable rows inside the
					cycles-list area.
				</p>
				<div className={styles.demo_card}>
					<div className={styles.demo_header}>
						<span className={styles.demo_label}>Details &amp; State</span>
						<button className={styles.demo_add_btn}>+ DETAILS &amp; STATE</button>
					</div>
					<div className={styles.demo_list} aria-label='cycles-list'>
						<div className={styles.demo_row}>
							<div className={styles.demo_row_body}>
								<input
									className={styles.demo_input}
									placeholder='Working on Void Presence'
									readOnly
									aria-label='Working on Void Presence'
								/>
								<input
									className={styles.demo_input}
									placeholder='Idle · Desktop client'
									readOnly
									aria-label='Idle · Desktop client'
								/>
							</div>
							<button className={styles.demo_remove_btn}>×</button>
						</div>
						<div className={styles.demo_row}>
							<div className={styles.demo_row_body}>
								<input
									className={styles.demo_input}
									placeholder='Playing Escape from Tarkov'
									readOnly
									aria-label='Playing Escape from Tarkov'
								/>
								<input
									className={styles.demo_input}
									placeholder='Custom RPC overlay'
									readOnly
									aria-label='Custom RPC overlay'
								/>
							</div>
							<button className={styles.demo_remove_btn}>×</button>
						</div>
						<div className={`${styles.demo_row} ${styles.demo_row_dragging}`}>
							<div className={styles.demo_row_body}>
								<input
									className={styles.demo_input}
									placeholder='Browsing configs on website'
									readOnly
									aria-label='Browsing configs on website'
								/>
								<input
									className={styles.demo_input}
									placeholder='Drag & drop profiles'
									readOnly
									aria-label='Drag & drop profiles'
								/>
							</div>
							<button className={styles.demo_remove_btn}>×</button>
						</div>
					</div>
					<div className={styles.demo_footer}>
						<div className={styles.demo_chip}>UPDATE(SEC): 30</div>
						<div className={styles.demo_chip}>3 STEPS IN CYCLE</div>
					</div>
				</div>
				<p className={styles.docs_text}>
					In the real app, each row in the cycles-list is draggable: on drag it darkens, gets a glow
					border and shadow, and you can drop it above or below other rows to change the order in
					which statuses appear in Discord.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Payload & logs</h3>
				<p className={styles.docs_text}>
					Below the main card, the current payload block shows the Buttons, Object, State and Uptime
					fields that match what is currently sent to Discord, and the logs tab collects a
					scrollable list of update entries.
				</p>
				<div className={styles.payload_demo}>
					<div className={styles.payload_demo_header}>current payload</div>
					<div className={styles.payload_demo_grid}>
						<span className={styles.payload_demo_label}>Buttons</span>
						<span className={styles.payload_demo_value}>Support · Website</span>
						<span className={styles.payload_demo_label}>Object</span>
						<span className={styles.payload_demo_value}>void_presence_activity_v2</span>
						<span className={styles.payload_demo_label}>State</span>
						<span className={styles.payload_demo_value}>Idle · Desktop client</span>
						<span className={styles.payload_demo_label}>Uptime</span>
						<span className={styles.payload_demo_value}>00:12:34</span>
					</div>
					<div className={styles.payload_demo_status}>last update: OK · 3 cycles</div>
				</div>
				<div className={styles.logs_demo}>
					<div className={styles.logs_demo_header}>
						<span className={styles.logs_demo_title}>logs</span>
						<span className={styles.logs_demo_counter}>3 entries</span>
					</div>
					<div className={styles.logs_demo_list}>
						<div className={styles.logs_demo_item}>
							<span className={styles.logs_demo_dot_success} />
							<div>
								<div className={styles.logs_demo_message}>Presence updated</div>
								<div className={styles.logs_demo_meta}>OK · 18:32:10</div>
							</div>
						</div>
						<div className={styles.logs_demo_item}>
							<span className={styles.logs_demo_dot_success} />
							<div>
								<div className={styles.logs_demo_message}>Presence updated</div>
								<div className={styles.logs_demo_meta}>OK · 18:31:40</div>
							</div>
						</div>
						<div className={styles.logs_demo_item_warn}>
							<span className={styles.logs_demo_dot_warn} />
							<div>
								<div className={styles.logs_demo_message}>Discord not detected</div>
								<div className={styles.logs_demo_meta}>WARN · 18:30:02</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Profiles &amp; cloud sync</h3>
				<p className={styles.docs_text}>
					Profiles store your cycles, images, buttons and client settings so you can quickly switch
					between different setups.
				</p>
				<div className={styles.profiles_demo}>
					<div className={styles.profiles_demo_header}>
						<span className={styles.profiles_demo_label}>Profiles</span>
						<span className={styles.profiles_demo_sub}>save / load presets</span>
					</div>
					<div className={styles.profiles_demo_row}>
						<span>name</span>
						<input placeholder='config name' readOnly value='Tarkov · Stream' />
						<button>save</button>
					</div>
					<div className={styles.profiles_demo_row}>
						<span>author ID</span>
						<input placeholder='optional author ID for cloud sync' readOnly value='vp_devollox' />
					</div>
					<div className={styles.profiles_demo_list_header}>
						<span className={styles.profiles_demo_list_label}>saved configs</span>
						<button className={styles.profiles_demo_small_btn}>export</button>
						<button className={styles.profiles_demo_small_btn}>+ config</button>
					</div>
					<div className={styles.profiles_demo_list}>
						<div className={styles.profiles_demo_item}>
							<div className={styles.profiles_demo_item_main}>
								<div className={styles.profiles_demo_item_title}>Tarkov · Stream</div>
								<div className={styles.profiles_demo_item_sub}>3 text, 2 images, 2 buttons</div>
							</div>
							<button className={styles.profiles_demo_item_btn}>load</button>
						</div>
						<div className={styles.profiles_demo_item}>
							<div className={styles.profiles_demo_item_main}>
								<div className={styles.profiles_demo_item_title}>Dev · Website</div>
								<div className={styles.profiles_demo_item_sub}>2 text, 1 image, 1 button</div>
							</div>
							<button className={styles.profiles_demo_item_btn}>load</button>
						</div>
					</div>
				</div>
				<p className={styles.docs_text}>
					Export and import use JSON files that match exactly the buttonPairs, cycles and
					imageCycles structures from the desktop client, so shared profiles behave the same on
					another machine.
				</p>
			</section>

			<section className={styles.docs_card}>
				<h3 className={styles.docs_subtitle}>Features</h3>
				<ul className={styles.docs_list}>
					<li className={styles.docs_list_item}>
						Custom button pairs – Multiple button sets with labels and URLs; leave the second empty
						if you only need a single button.
					</li>
					<li className={styles.docs_list_item}>
						Status cycles – Rotate multiple details and state texts on a timer, independently from
						images and buttons.
					</li>
					<li className={styles.docs_list_item}>
						Image rotation – Cycle through large and small Rich Presence images; shorter image lists
						are reused automatically.
					</li>
					<li className={styles.docs_list_item}>
						Profiles with drag &amp; drop – Create and reorder presence presets.
					</li>
					<li className={styles.docs_list_item}>
						Config import / export – Move setups between machines via JSON.
					</li>
					<li className={styles.docs_list_item}>
						Auto-launch &amp; auto-hide – Optional start on boot and to tray.
					</li>
				</ul>
			</section>
		</article>
	)

	return (
		<Page>
			<PageHeader
				title='Void Presence Docs'
				subtitle='Learn how to install, configure and debug your Discord Rich Presence.'
			/>
			<PanelLayout left={left} right={right} />
			<Footer />
		</Page>
	)
}
