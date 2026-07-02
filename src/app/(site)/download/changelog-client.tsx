'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './download.module.scss'

interface ReleaseAsset {
	name: string
	size: number
	downloadUrl: string
}

interface ReleaseInfo {
	version: string | number | null
	date: string
	notes: string
	assets: ReleaseAsset[]
	versionType?: string
}

export default function ChangelogClient({ release }: { release: ReleaseInfo }) {
	const [open, setOpen] = useState(false)

	if (!release.notes) return null

	return (
		<div className={styles.changelog_box}>
			<button type='button' className={styles.changelog_toggle} onClick={() => setOpen(v => !v)}>
				<div className={styles.changelog_toggle_left}>
					<span className={styles.changelog_title}>
						{release.versionType === 'api'
							? 'Result'
							: release.versionType === 'apiBody'
								? 'Fetch'
								: 'Changelog'}
					</span>
				</div>
				<span>{open ? '−' : '+'}</span>
			</button>

			<div
				className={
					open ? `${styles.changelog_text} ${styles.changelog_text_open}` : styles.changelog_text
				}
			>
				<ReactMarkdown
					components={{
						h1: ({ node, ...props }) => <h4 className={styles.changelog_h1} {...props} />,
						h2: ({ node, ...props }) => <h4 className={styles.changelog_h2} {...props} />,
						h3: ({ node, ...props }) => <h5 className={styles.changelog_h3} {...props} />,
						ul: ({ node, ...props }) => <ul className={styles.changelog_list} {...props} />,
						li: ({ node, ...props }) => <li className={styles.changelog_item} {...props} />,
						p: ({ node, ...props }) => <p className={styles.changelog_p} {...props} />,
					}}
				>
					{release.notes}
				</ReactMarkdown>
			</div>
		</div>
	)
}
