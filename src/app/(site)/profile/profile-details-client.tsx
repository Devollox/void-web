'use client'

import type { Config } from '@/service/firebase'
import RpcPreview from '@components/rpc-preview/rpc-user'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import styles from './profile-details.module.scss'

type Props = {
	user: any
	authorID: number | string
	session: Session
	lastConfig: Config | null
}

function getNextTick(prev: number) {
	return prev + 1
}

export function ProfileDetailsClient({ user, lastConfig, authorID }: Props) {
	const [copied, setCopied] = useState(false)
	const [previewTick, setPreviewTick] = useState(0)

	useEffect(() => {
		const interval = setInterval(() => {
			setPreviewTick(prev => getNextTick(prev))
		}, 3000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	const configData: any = lastConfig?.configData
	const cycles = configData?.cycles?.length ? configData.cycles : [{ details: '', state: '' }]
	const images = configData?.imageCycles?.length ? configData.imageCycles : [{ largeImage: '' }]
	const buttonsList = configData?.buttonPairs?.length
		? configData.buttonPairs
		: [{ label1: '', url1: '' }]

	const maxLen = Math.max(cycles.length || 1, images.length || 1, buttonsList.length || 1)
	const localIndex = maxLen ? previewTick % maxLen : 0

	const cycleIndex = localIndex % cycles.length
	const imageIndex = localIndex % images.length
	const buttonIndex = localIndex % buttonsList.length

	const firstCycle = cycles[cycleIndex]
	const firstImage = images[imageIndex]
	const firstButtons = buttonsList[buttonIndex]
	const avatarSrc = lastConfig?.authorAvatar || '/logo.png'

	const handleCopyUserId = async () => {
		if (!user?.id) return
		try {
			await navigator.clipboard.writeText(String(user.id))
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {}
	}

	return (
		<section id='addon-details' className={styles.page_section}>
			<div className={styles.theme_view_panel}>
				<img
					key={firstImage.largeImage || null}
					src={firstImage.largeImage || undefined}
					className={styles.addon_backdrop}
					alt=''
				/>

				<div>
					<div className={styles.addon_splitview_container}>
						<div className={styles.addon_details_right_column}>
							<div className={styles.addon_details_segment}>
								<a href='/' className={styles.back_link}>
									← Back to Home
								</a>
								<h1 className={styles.title}>{user.name || 'Your profile'}</h1>
								<div className={styles.title_description}>
									<strong>Email: </strong>
									{user.email || 'No email linked'}
								</div>
								<section className={styles.addon_actions}>
									<div className={styles.btn_container}>
										<a
											href='/download'
											className={`${styles.download_btn_primary} ${styles.back_download_btn_primary}`}
										>
											Download Void Presence
										</a>
									</div>
								</section>
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.rpc_card_preview}>
								{lastConfig && configData ? (
									<RpcPreview
										discriminator={`#${String(user.id ?? '').slice(0, 4) || '0001'}`}
										username={user.name || 'User'}
										avatarSrc={avatarSrc}
										currentCycle={firstCycle}
										currentImage={firstImage}
										currentButtons={firstButtons}
										currentIndex={localIndex}
										config={configData}
									/>
								) : (
									<div className={styles.skel_rpc} />
								)}
							</div>
						</div>

						<div className={styles.addon_details_middle_column}>
							<div className={styles.actions_panel}>
								<h2 className={styles.actions_title}>Profile actions</h2>
								<p className={styles.actions_subtitle}>Manage your account and configs.</p>
								<div className={styles.actions_buttons}>
									<a href='/configs' className={styles.action_btn_primary}>
										<span>View all configs</span>
										<span className={styles.action_btn_hint}>community list</span>
									</a>
									<a
										href={`voidpresence://auth?authorId=${encodeURIComponent(
											String(authorID)
										)}&name=${encodeURIComponent(user.name || '')}&provider=${encodeURIComponent(
											user.provider || ''
										)}&avatar=${encodeURIComponent(user.image || '')}`}
										className={styles.action_btn_primary}
										rel='noreferrer'
									>
										<span>Use this author ID in app</span>
										<span className={styles.action_btn_hint}>open app and connect profile</span>
									</a>
									<button
										type='button'
										className={styles.action_btn_secondary}
										onClick={handleCopyUserId}
									>
										<span>{copied ? 'Copied' : 'Copy author ID'}</span>
										<span className={styles.action_btn_hint}>
											{copied ? 'success' : 'to clipboard'}
										</span>
									</button>
									<button
										type='button'
										className={styles.action_btn_secondary}
										onClick={() => signOut({ callbackUrl: '/' })}
									>
										<span>Sign out</span>
										<span className={styles.action_btn_hint}>end session</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
