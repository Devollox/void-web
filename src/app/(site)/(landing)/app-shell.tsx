'use client'

import { ReactNode } from 'react'
import styles from './app-shell.module.scss'

export type AppShellTabId = string

interface AppShellTab {
	id: AppShellTabId
	label: string
}

interface AppShellProps {
	title: string
	subtitle: string
	tabs?: AppShellTab[]
	activeTabId?: AppShellTabId
	onTabChange?: (id: AppShellTabId) => void
	statusLabel?: string
	statusHint?: string
	children?: ReactNode
}

export default function AppShell({
	subtitle,
	tabs = [],
	activeTabId,
	onTabChange,
	statusLabel,
	statusHint,
	children,
}: AppShellProps) {
	return (
		<div className={styles.config_preview}>
			<div className={styles.app_header}>
				<div className={styles.app_title_group}>
					<div className={styles.app_logo}>vP</div>
					<div>
						<div className={styles.app_title}>VOID</div>
						<div className={styles.app_subtitle}>{subtitle}</div>
					</div>
				</div>
				{tabs.length > 0 && (
					<div className={styles.app_tabs}>
						{tabs.map(tab => (
							<button
								key={tab.id}
								className={`${styles.app_tab} ${
									activeTabId === tab.id ? styles.app_tab_active : ''
								}`}
								onClick={() => onTabChange && onTabChange(tab.id)}
								type='button'
							>
								{tab.label}
							</button>
						))}
					</div>
				)}
			</div>

			{(statusLabel || statusHint) && (
				<div className={styles.app_status_bar}>
					{statusLabel && (
						<span className={styles.app_status_pill}>
							<span className={styles.app_status_led} />
							{statusLabel}
						</span>
					)}
					{statusHint && <span className={styles.app_status_hint}>{statusHint}</span>}
				</div>
			)}

			{children}
		</div>
	)
}
