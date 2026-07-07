'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { ProgressBar } from '../progress-bar'
import styles from './rpc-preview.module.scss'

interface Cycle {
	details: string
	state: string
}

interface ImageCycle {
	largeImage: string
	largeText?: string
}

interface ButtonPair {
	label1: string
	url1: string
	label2?: string
	url2?: string
}

interface ConfigData {
	cycles: Cycle[]
	imageCycles: ImageCycle[]
	buttonPairs: ButtonPair[]
}

interface RpcPreviewProps {
	username?: string
	discriminator?: string
	activityType?: string
	currentCycle?: Cycle
	currentImage?: ImageCycle
	currentButtons?: ButtonPair | null
	currentIndex?: number
	config?: Partial<ConfigData>
	avatarSrc?: string
	profileHref?: string
}

const FALLBACK_AVATAR = '/logo.png'
const FALLBACK_ART = '/logo.png'

const RpcUser = memo(
	({
		username = 'Devollox',
		discriminator = '#0001',
		avatarSrc,
		profileHref,
	}: {
		username?: string
		discriminator?: string
		avatarSrc?: string
		profileHref?: string
	}) => {
		const initialSrc = avatarSrc || FALLBACK_AVATAR
		const [imgSrc, setImgSrc] = useState(initialSrc)
		const prevSrcRef = useRef(initialSrc)

		useEffect(() => {
			const nextSrc = avatarSrc || FALLBACK_AVATAR
			if (prevSrcRef.current === nextSrc) return
			prevSrcRef.current = nextSrc
			setImgSrc(nextSrc)
		}, [avatarSrc])

		const displayTag = discriminator
			? discriminator.startsWith('#')
				? discriminator
				: `#${discriminator}`
			: '#0000'

		const content = (
			<>
				{profileHref ? (
					<a
						href={profileHref}
						className={styles.rpc_user_link}
						onClick={e => {
							if (e.metaKey || e.ctrlKey || e.button === 1) return
						}}
					>
						<div className={styles.rpc_avatar}>
							<div className={styles.avatar_placeholder}>
								<img
									src={imgSrc}
									alt='Avatar'
									width={48}
									height={48}
									onError={() => setImgSrc(FALLBACK_AVATAR)}
								/>
							</div>
							<div className={styles.status_indicator} />
						</div>
					</a>
				) : (
					<div className={styles.rpc_avatar}>
						<div className={styles.avatar_placeholder}>
							<img
								src={imgSrc}
								alt='Avatar'
								width={48}
								height={48}
								onError={() => setImgSrc(FALLBACK_AVATAR)}
							/>
						</div>
						<div className={styles.status_indicator} />
					</div>
				)}

				<div>
					<div className={styles.username}>{username}</div>
					<div className={styles.discriminator}>{displayTag}</div>
				</div>
			</>
		)

		return <div className={styles.rpc_user}>{content}</div>
	}
)
RpcUser.displayName = 'RpcUser'

const RpcActivityArt = memo(
	({ src }: { src: string }) => {
		const imgRef = useRef<HTMLImageElement>(null)
		const lastSrcRef = useRef<string>(src || FALLBACK_ART)

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
					src={src || FALLBACK_ART}
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

const RpcActivityDetails = ({
	currentCycle = { details: 'No details', state: 'No state' },
	currentIndex = 0,
	config,
}: {
	currentCycle?: Cycle
	currentIndex?: number
	config?: Partial<ConfigData>
}) => {
	const cycles = config?.cycles ?? []
	const images = config?.imageCycles ?? []
	const buttonPairs = config?.buttonPairs ?? []
	const maxLen = Math.max(cycles.length || 1, images.length || 1, buttonPairs.length || 1)
	const clampedIndex = (((currentIndex ?? 0) % maxLen) + maxLen) % maxLen
	const progress = maxLen > 0 ? ((clampedIndex + 1) / maxLen) * 100 : 100

	return (
		<div className={styles.activity_details}>
			<div className={styles.details_title}>{currentCycle.details}</div>
			<div className={styles.details_state}>{currentCycle.state}</div>
			<ProgressBar value={progress} />
		</div>
	)
}

const RpcButton = ({ label, url }: { label: string; url: string }) => (
	<a href={url} className={styles.rpc_btn} target='_blank' rel='noopener noreferrer'>
		{label}
	</a>
)

const RpcButtons = memo(
	({ buttons }: { buttons: Array<{ label: string; url: string }> }) => (
		<div className={styles.rpc_buttons}>
			{buttons.map((button, index) => (
				<RpcButton key={index} {...button} />
			))}
		</div>
	),
	(prevProps, nextProps) => JSON.stringify(prevProps.buttons) === JSON.stringify(nextProps.buttons)
)
RpcButtons.displayName = 'RpcButtons'

const RpcActivity = ({
	activityType,
	currentCycle,
	currentImage,
	currentIndex,
	config,
	hasButtons,
}: {
	activityType?: string
	currentCycle?: Cycle
	currentImage?: ImageCycle
	currentIndex?: number
	config?: Partial<ConfigData>
	hasButtons: boolean
}) => {
	const imageSrc = currentImage?.largeImage || FALLBACK_ART

	return (
		<div className={styles.rpc_activity}>
			<div className={styles.activity_type}>{activityType}</div>
			<div
				className={`${styles.activity_content} ${
					!hasButtons ? styles.activity_content_noButtons : ''
				}`}
			>
				<RpcActivityArt src={imageSrc} />
				<RpcActivityDetails
					currentCycle={currentCycle}
					currentIndex={currentIndex}
					config={config}
				/>
			</div>
		</div>
	)
}

export default function RpcPreview({
	username,
	discriminator,
	activityType,
	currentCycle,
	currentImage,
	currentButtons,
	currentIndex,
	config,
	avatarSrc,
	profileHref,
}: RpcPreviewProps) {
	const buttons: Array<{ label: string; url: string }> = []

	if (currentButtons) {
		if (currentButtons.label1 && currentButtons.url1) {
			buttons.push({ label: currentButtons.label1, url: currentButtons.url1 })
		}
		if (currentButtons.label2 && currentButtons.url2) {
			buttons.push({ label: currentButtons.label2, url: currentButtons.url2 })
		}
	}

	const hasButtons = buttons.length > 0

	return (
		<div className={styles.rpc_preview}>
			<RpcUser
				username={username}
				discriminator={discriminator}
				avatarSrc={avatarSrc}
				profileHref={profileHref}
			/>
			<RpcActivity
				activityType={activityType}
				currentCycle={currentCycle}
				currentImage={currentImage}
				currentIndex={currentIndex}
				config={config}
				hasButtons={hasButtons}
			/>
			{hasButtons && <RpcButtons buttons={buttons} />}
		</div>
	)
}
