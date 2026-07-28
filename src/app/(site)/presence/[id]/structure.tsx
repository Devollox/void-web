'use client'

import type { ConfigData } from '@/services/firebase'
import { useState } from 'react'
import styles from './config-details.module.scss'

type Props = {
	configData: ConfigData
}

export function ConfigStructure({ configData }: Props) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<button
				type='button'
				className={`${styles.details_toggle} ${open ? styles.details_toggle_open : ''}`}
				onClick={() => setOpen(o => !o)}
			>
				<div className={styles.details_toggle_left}>
					<span className={styles.details_chevron}>{open ? '−' : '+'}</span>
					<span className={styles.details_title}>Config structure</span>
				</div>
				<span className={styles.details_count}>
					{configData.cycles?.length ?? 0} cycles • {configData.imageCycles?.length ?? 0} images •{' '}
					{configData.buttonPairs?.length ?? 0} button sets
				</span>
			</button>

			<article
				className={`${styles.markdown_readme_content} ${
					open ? styles.markdown_readme_content_open : ''
				}`}
			>
				<div className={styles.cycle_column}>
					<h2>Cycles</h2>
					<div className={styles.cycle_list}>
						{configData.cycles?.length ? (
							configData.cycles.map((cycle, index) => (
								<div key={index} className={styles.cycle_item}>
									<div className={styles.cycle_badge}>
										{index + 1}/{configData.cycles.length}
									</div>
									<div className={styles.cycle_details}>
										<div className={styles.cycle_title}>{cycle.details || 'No details'}</div>
										<div className={styles.cycle_state}>{cycle.state || 'No state'}</div>
									</div>
								</div>
							))
						) : (
							<div className={styles.empty_text}>No cycles</div>
						)}
					</div>
				</div>

				<div className={styles.cycle_column}>
					<h2>Images</h2>
					<div className={styles.cycle_list}>
						{configData.imageCycles?.length ? (
							configData.imageCycles.map((img, index) => (
								<div key={index} className={styles.cycle_item}>
									<div className={styles.cycle_badge}>
										{index + 1}/{configData.imageCycles.length}
									</div>
									<div className={styles.cycle_details}>
										<div className={styles.cycle_title}>{img.largeImage || 'No image key'}</div>
									</div>
								</div>
							))
						) : (
							<div className={styles.empty_text}>No images</div>
						)}
					</div>
				</div>

				<div className={styles.cycle_column}>
					<h2>Buttons</h2>
					<div className={styles.cycle_list}>
						{configData.buttonPairs?.length ? (
							configData.buttonPairs.map((pair, index) => (
								<div key={index} className={styles.cycle_item}>
									<div className={styles.cycle_badge}>
										{index + 1}/{configData.buttonPairs.length}
									</div>
									<div className={styles.cycle_details}>
										<div className={styles.cycle_title}>{pair.label1 || 'Button 1'}</div>
										<div className={styles.cycle_state}>{pair.url1 || 'No URL'}</div>
										{pair.label2 && pair.url2 && (
											<>
												<div className={styles.cycle_title}>{pair.label2}</div>
												<div className={styles.cycle_state}>{pair.url2}</div>
											</>
										)}
									</div>
								</div>
							))
						) : (
							<div className={styles.empty_text}>No buttons</div>
						)}
					</div>
				</div>
			</article>
		</>
	)
}
