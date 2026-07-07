'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ProgressBar } from '../progress-bar'
import styles from '../rpc-preview/rpc-preview.module.scss'

interface StatusCycle {
	text: string
}

interface StatusConfigData {
	statusCycles: StatusCycle[]
}

interface StatusPreviewProps {
	username?: string
	discriminator?: string
	activityType?: string
	currentStatus?: StatusCycle
	currentIndex?: number
	config?: Partial<StatusConfigData>
	avatarSrc?: string
	profileHref?: string
}

const FALLBACK_AVATAR = '/logo.png'

const StatusUser = ({
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
							<Image
								src={imgSrc}
								alt='Avatar'
								width={48}
								height={48}
								unoptimized
								onError={() => setImgSrc(FALLBACK_AVATAR)}
							/>
						</div>
						<div className={styles.status_indicator} />
					</div>
				</a>
			) : (
				<div className={styles.rpc_avatar}>
					<div className={styles.avatar_placeholder}>
						<Image
							src={imgSrc}
							alt='Avatar'
							width={48}
							height={48}
							unoptimized
							onError={() => setImgSrc(FALLBACK_AVATAR)}
						/>
					</div>
					<div className={styles.status_indicator} />
				</div>
			)}

			<div>
				<div className={styles.username}>{username}</div>
				<div className={styles.discriminator}>{discriminator}</div>
			</div>
		</>
	)

	return <div className={styles.rpc_user}>{content}</div>
}

const StatusDetails = ({
	currentStatus = { text: 'No status' },
	currentIndex = 0,
	config,
}: {
	currentStatus?: StatusCycle
	currentIndex?: number
	config?: Partial<StatusConfigData>
}) => {
	const cycles = config?.statusCycles ?? []
	const maxLen = cycles.length || 1
	const clampedIndex = (((currentIndex ?? 0) % maxLen) + maxLen) % maxLen
	const progress = maxLen > 0 ? ((clampedIndex + 1) / maxLen) * 100 : 100

	return (
		<div className={styles.activity_details}>
			<div className={styles.details_title}>{currentStatus.text}</div>
			<ProgressBar value={progress} />
		</div>
	)
}

const StatusActivity = ({
	activityType,
	currentStatus,
	currentIndex,
	config,
}: {
	activityType?: string
	currentStatus?: StatusCycle
	currentIndex?: number
	config?: Partial<StatusConfigData>
}) => (
	<div className={styles.rpc_activity}>
		<div className={styles.activity_type}>{activityType}</div>
		<div className={styles.activity_content}>
			<StatusDetails currentStatus={currentStatus} currentIndex={currentIndex} config={config} />
		</div>
	</div>
)

export default function StatusPreview({
	username,
	discriminator,
	activityType,
	currentStatus,
	currentIndex,
	config,
	avatarSrc,
	profileHref,
}: StatusPreviewProps) {
	return (
		<div className={styles.rpc_preview}>
			<StatusUser
				username={username}
				discriminator={discriminator}
				avatarSrc={avatarSrc}
				profileHref={profileHref}
			/>
			<StatusActivity
				activityType={activityType}
				currentStatus={currentStatus}
				currentIndex={currentIndex}
				config={config}
			/>
		</div>
	)
}
