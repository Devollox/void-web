'use client'

import Logo from '@public/logo.png'
import Image from 'next/image'
import { memo, useEffect, useRef } from 'react'
import RpcLabel from '../label'
import styles from './rpc-preview.module.scss'

type Cycle = {
	details: string
	state: string
}

type ImageCycle = {
	largeImage: string
	largeText?: string
}

type ButtonPair = {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

type ConfigData = {
	cycles: Array<{ details: string; state: string }>
	imageCycles: Array<{ largeImage: string; largeText?: string }>
	buttonPairs: Array<{ label1: string; url1: string; label2?: string; url2?: string }>
}

type Props = {
	currentCycle: Cycle
	currentImage: ImageCycle
	currentButtons?: ButtonPair
	currentIndex: number
	config: ConfigData
	username?: string
	discriminator?: string
	activityType?: string
	avatarSrc?: string
}

const FALLBACK_ART = '/logo.png'

const RpcActivityArt = memo(
	({ src }: { src: string }) => {
		const imgRef = useRef<HTMLImageElement>(null)
		const lastSrcRef = useRef<string>('')

		useEffect(() => {
			const nextSrc = src || FALLBACK_ART
			if (lastSrcRef.current === nextSrc) return
			lastSrcRef.current = nextSrc
			if (imgRef.current) {
				imgRef.current.src = nextSrc
			}
		}, [src])

		return (
			<div className={styles.activity_art}>
				<img
					ref={imgRef}
					width={64}
					height={64}
					defaultValue={src || FALLBACK_ART}
					alt='Activity art'
					className={styles.large_art}
					onError={e => {
						lastSrcRef.current = FALLBACK_ART
						;(e.target as HTMLImageElement).src = FALLBACK_ART
					}}
				/>
				<div className={styles.art_overlay} />
			</div>
		)
	},
	(prevProps, nextProps) => prevProps.src === nextProps.src
)

RpcActivityArt.displayName = 'RpcActivityArt'

const RpcPreview = memo(function RpcPreview({
	currentCycle,
	currentImage,
	currentButtons,
	currentIndex,
	config,
	username = 'Devollox',
	discriminator = '#0001',
	activityType = 'Void Presence',
	avatarSrc,
}: Props) {
	const buttons: Array<{ label: string; url: string }> = []

	if (currentButtons?.label1 && currentButtons?.url1) {
		buttons.push({ label: currentButtons.label1, url: currentButtons.url1 })
	}

	if (currentButtons?.label2 && currentButtons?.url2) {
		buttons.push({ label: currentButtons.label2, url: currentButtons.url2 })
	}

	const cyclesLen = config.cycles?.length || 1
	const normalizedIndex = (((currentIndex % cyclesLen) + cyclesLen) % cyclesLen) + 1
	const progress = Math.round((normalizedIndex / cyclesLen) * 100)
	const safeAvatarSrc = avatarSrc || Logo
	const imageSrc = currentImage?.largeImage || FALLBACK_ART

	return (
		<section id='rpc-preview-section' className={styles.rpc_section}>
			<div className={`${styles.page_section_inner} ${styles.rpc_inner}`}>
				<RpcLabel text='LIVE PRESENCE' />
				<div className={styles.rpc_preview}>
					<div className={styles.rpc_user}>
						<div className={styles.rpc_avatar}>
							<div className={styles.avatar_placeholder}>
								<Image src={safeAvatarSrc} alt='Avatar' width={48} height={48} unoptimized />
							</div>
							<div className={styles.status_indicator} />
						</div>
						<div>
							<div className={styles.username}>{username}</div>
							<div className={styles.discriminator}>{discriminator}</div>
						</div>
					</div>

					<div className={styles.rpc_activity}>
						<div className={styles.activity_type}>{activityType}</div>
						<div className={styles.activity_content}>
							<RpcActivityArt src={imageSrc} />

							<div className={styles.activity_details}>
								<div className={styles.details_title}>{currentCycle.details}</div>
								<div className={styles.details_state}>{currentCycle.state}</div>
								<div className={styles.progress_bar}>
									<div className={styles.progress_bg}>
										<div className={styles.progress_fill} style={{ width: `${progress}%` }} />
									</div>
									<div className={styles.progress_time}>{progress}%</div>
								</div>
							</div>
						</div>

						{buttons.length > 0 && (
							<div className={styles.rpc_buttons}>
								{buttons.map((button, index) => (
									<a
										key={index}
										href={button.url}
										className={styles.rpc_btn}
										target='_blank'
										rel='noopener noreferrer'
									>
										{button.label}
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	)
})

export default RpcPreview
