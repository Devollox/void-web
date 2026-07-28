'use client'

import type { Status } from '@/services/firebase'
import { useState } from 'react'
import styles from '../../presence/[id]/config-details.module.scss'

type Props = {
	status: Status
}

export function StatusStructure({ status }: Props) {
	const [open, setOpen] = useState(false)
	const cycles = status.configData?.statusCycles ?? []

	return (
		<>
			<button
				type='button'
				className={`${styles.details_toggle} ${open ? styles.details_toggle_open : ''}`}
				onClick={() => setOpen(o => !o)}
			>
				<div className={styles.details_toggle_left}>
					<span className={styles.details_chevron}>{open ? '−' : '+'}</span>
					<span className={styles.details_title}>Status structure</span>
				</div>
				<span className={styles.details_count}>{cycles.length} status cycles</span>
			</button>

			<article
				className={`${styles.markdown_readme_content} ${
					open ? styles.markdown_readme_content_open : ''
				}`}
				style={{ gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}
			>
				<div className={styles.cycle_column}>
					<h2>Status cycles</h2>
					<div className={styles.cycle_list}>
						{cycles.length ? (
							cycles.map((cycle, index) => (
								<div key={index} className={styles.cycle_item}>
									<div className={styles.cycle_badge}>
										{index + 1}/{cycles.length}
									</div>
									<div className={styles.cycle_details}>
										<div className={styles.cycle_title}>{cycle.details || 'Empty status'}</div>
									</div>
								</div>
							))
						) : (
							<div className={styles.empty_text}>No status cycles</div>
						)}
					</div>
				</div>
			</article>
		</>
	)
}
