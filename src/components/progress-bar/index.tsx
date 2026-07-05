'use client'

import React from 'react'
import styles from '../rpc-preview/rpc-preview.module.scss'

type ProgressBarProps = {
	value: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
	return (
		<div className={styles.progress_bar}>
			<div className={styles.progress_bg}>
				<div
					className={styles.progress_fill}
					style={{ '--progress-value': `${value}%` } as React.CSSProperties}
				/>
			</div>
			<div className={styles.progress_time}>{Math.round(value)}%</div>
		</div>
	)
}
