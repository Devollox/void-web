'use client'

import RpcPreview, { ConfigData } from '@components/rpc-preview'
import { useEffect, useState } from 'react'
import ConfigPreview from './config-preview'
import FeaturesSection from './features-section'
import HeroSection from './hero-section'
import InstallGuide from './install-guide-section'

type Props = {
	config: ConfigData
}

export default function PageHomeClient({ config }: Props) {
	const [currentIndex, setCurrentIndex] = useState(0)
	const [activeTab, setActiveTab] = useState<'MAIN' | 'LOGS' | 'CONFIG'>('CONFIG')

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentIndex(prev => (prev + 1) % config.cycles.length)
		}, 1500)

		return () => clearInterval(interval)
	}, [config.cycles.length])

	const currentCycle = config.cycles[currentIndex]
	const currentImage = config.imageCycles[currentIndex]
	const currentButtons = config.buttonPairs[currentIndex]

	if (!currentCycle || !currentImage || !currentButtons) return

	return (
		<>
			<HeroSection />
			<RpcPreview
				currentCycle={currentCycle}
				currentImage={currentImage}
				currentButtons={currentButtons}
				currentIndex={currentIndex}
				config={config}
			/>
			<ConfigPreview activeTab={activeTab} setActiveTab={setActiveTab} />
			<FeaturesSection />
			<InstallGuide />
		</>
	)
}
