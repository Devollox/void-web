'use client'

import RpcLabel from '@components/label'
import { useState } from 'react'
import AppShell from './app-shell'
import styles from './features-section.module.scss'

export default function FeaturesSection() {
	const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'cycles'>('overview')

	const renderTabContent = () => {
		switch (activeTab) {
			case 'overview':
				return (
					<div className={styles.features_layout}>
						<div className={styles.features_list}>
							<div className={styles.feature_item}>
								<span className={styles.feature_badge}>Profiles</span>
								<div className={styles.feature_title}>Multiple presets</div>
								<div className={styles.feature_text}>
									Create different profiles for games, work sessions or chill modes and switch them
									in one click.
								</div>
							</div>
							<div className={styles.feature_item}>
								<span className={styles.feature_badge}>Status cycles</span>
								<div className={styles.feature_title}>Rotating details</div>
								<div className={styles.feature_text}>
									Rotate through rich presence texts over time instead of a static single line.
								</div>
							</div>
						</div>
						<div className={styles.features_summary}>
							<div className={styles.summary_header}>
								<span className={styles.summary_label}>ACTIVE PROFILE</span>
								<span className={styles.summary_name}>Cosmic</span>
							</div>
							<div className={styles.summary_stats_row}>
								<div className={styles.summary_stat}>
									<span className={styles.summary_stat_value}>8</span>
									<span className={styles.summary_stat_label}>cycles</span>
								</div>
								<div className={styles.summary_stat}>
									<span className={styles.summary_stat_value}>8</span>
									<span className={styles.summary_stat_label}>images</span>
								</div>
								<div className={styles.summary_stat}>
									<span className={styles.summary_stat_value}>8</span>
									<span className={styles.summary_stat_label}>button pairs</span>
								</div>
								<div className={styles.summary_stat}>
									<span className={styles.summary_stat_value}>30s</span>
									<span className={styles.summary_stat_label}>interval</span>
								</div>
							</div>
							<div className={styles.summary_footer}>
								Config lives in <span className={styles.summary_code}>/config</span> as JSON, so you
								can version it with Git.
							</div>
						</div>
					</div>
				)
			case 'profiles':
				return (
					<div className={styles.config_tab_view}>
						<div className={styles.log_entry}>
							<span className={styles.log_level}></span>
							<span className={styles.log_time}>10:32:23 · INFO</span>
							<span className={styles.log_text}>RPC ready</span>
						</div>
						<div className={styles.log_entry}>
							<span className={styles.log_level}></span>
							<span className={styles.log_time}>10:32:18 · INFO</span>
							<span className={styles.log_text}>Connecting RPC with clientId</span>
						</div>
					</div>
				)
			case 'cycles':
				return (
					<div className={styles.config_tab_view}>
						<div className={styles.config_row}>
							<span className={styles.config_field_label}>Cycle Text</span>
							<div className={styles.config_field_group}>
								<input className={styles.config_field_input} placeholder='Exploring the void...' />
								<button className={styles.config_add_button}>+</button>
							</div>
						</div>
						<div className={styles.config_footer_row}>
							<span>8 items total</span>
							<span>30s interval</span>
						</div>
					</div>
				)
		}
	}

	return (
		<section id='features-section' className={styles.config_section}>
			<div
				className={`${styles.page_section_inner} ${styles.rpc_inner} ${styles.features_section_inner}`}
			>
				<RpcLabel text='FEATURES' />
				<AppShell
					title='VOID'
					subtitle='WHAT YOU CONTROL'
					tabs={[
						{ id: 'overview', label: 'OVERVIEW' },
						{ id: 'profiles', label: 'PROFILES' },
						{ id: 'cycles', label: 'CYCLES' },
					]}
					activeTabId={activeTab}
					onTabChange={id => setActiveTab(id as typeof activeTab)}
					statusLabel='POWER USER'
					statusHint='Profiles · Cycles · Images · Buttons'
				>
					{renderTabContent()}
				</AppShell>
			</div>
		</section>
	)
}
