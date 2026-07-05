'use client'

import { useEffect, useRef, useState } from 'react'
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
}

const FALLBACK_AVATAR = '/logo.png'
const FALLBACK_ART = '/placeholder.jpg'

const RpcUser = ({
	username = 'Devollox',
	discriminator = '#0001',
	avatarSrc,
}: {
	username?: string
	discriminator?: string
	avatarSrc?: string
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

	return (
		<div className={styles.rpc_user}>
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
			<div>
				<div className={styles.username}>{username}</div>
				<div className={styles.discriminator}>{displayTag}</div>
			</div>
		</div>
	)
}

const RpcActivityArt = ({
	currentImage = { largeImage: FALLBACK_ART },
}: {
	currentImage?: ImageCycle
}) => {
	const initialSrc = currentImage.largeImage || FALLBACK_ART
	const [imgSrc, setImgSrc] = useState(initialSrc)
	const prevSrcRef = useRef(initialSrc)

	useEffect(() => {
		const nextSrc = currentImage.largeImage || FALLBACK_ART
		if (prevSrcRef.current === nextSrc) return
		prevSrcRef.current = nextSrc
		setImgSrc(nextSrc)
	}, [currentImage.largeImage])

	return (
		<div className={styles.activity_art}>
			<img
				width={64}
				height={64}
				src={imgSrc}
				alt='Activity art'
				className={styles.large_art}
				onError={() => setImgSrc(FALLBACK_ART)}
			/>
			<div className={styles.art_overlay} />
		</div>
	)
}

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

const RpcButtons = ({ buttons }: { buttons: Array<{ label: string; url: string }> }) => (
	<div className={styles.rpc_buttons}>
		{buttons.map((button, index) => (
			<RpcButton key={index} {...button} />
		))}
	</div>
)

const RpcActivity = ({
	activityType,
	currentCycle,
	currentImage,
	currentIndex,
	config,
}: {
	activityType?: string
	currentCycle?: Cycle
	currentImage?: ImageCycle
	currentIndex?: number
	config?: Partial<ConfigData>
}) => (
	<div className={styles.rpc_activity}>
		<div className={styles.activity_type}>{activityType}</div>
		<div className={styles.activity_content}>
			<RpcActivityArt currentImage={currentImage} />
			<RpcActivityDetails currentCycle={currentCycle} currentIndex={currentIndex} config={config} />
		</div>
	</div>
)

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
}: RpcPreviewProps) {
	const buttons: Array<{ label: string; url: string }> = []

	if (currentButtons) {
		buttons.push({ label: currentButtons.label1, url: currentButtons.url1 })
		if (currentButtons.label2 && currentButtons.url2) {
			buttons.push({ label: currentButtons.label2, url: currentButtons.url2 })
		}
	}

	return (
		<div className={styles.rpc_preview}>
			<RpcUser username={username} discriminator={discriminator} avatarSrc={avatarSrc} />
			<RpcActivity
				activityType={activityType}
				currentCycle={currentCycle}
				currentImage={currentImage}
				currentIndex={currentIndex}
				config={config}
			/>
			{buttons.length > 0 && <RpcButtons buttons={buttons} />}
		</div>
	)
}
