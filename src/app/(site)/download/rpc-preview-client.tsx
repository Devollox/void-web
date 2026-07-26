'use client'

import RpcPreview from '@components/rpc-preview/rpc-user'
import { useEffect, useState } from 'react'

interface RpcPreviewClientProps {
	config: any
}

export default function RpcPreviewClient({ config }: RpcPreviewClientProps) {
	const [currentIndex, setCurrentIndex] = useState(0)

	useEffect(() => {
		const interval = setInterval(
			() => setCurrentIndex(prev => (prev + 1) % config.cycles.length),
			1500
		)
		return () => clearInterval(interval)
	}, [config.cycles.length])

	const currentCycle = config.cycles[currentIndex]
	const currentImage = config.imageCycles[currentIndex]
	const currentButtons = config.buttonPairs[currentIndex]

	return (
		<RpcPreview
			currentCycle={currentCycle}
			currentImage={currentImage}
			currentButtons={currentButtons}
			currentIndex={currentIndex}
			config={config}
		/>
	)
}
