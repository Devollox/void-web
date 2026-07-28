import { useCountUp } from '@/hooks/use-count-up'

interface CountUpProps {
	to: number
	from?: number
	direction?: 'up' | 'down'
	delay?: number
	duration?: number
	className?: string
	startWhen?: boolean
	separator?: string
	onStart?: () => void
	onEnd?: () => void
}

export default function CountUp(props: CountUpProps) {
	const { ref } = useCountUp(props)
	return <span style={{ opacity: '1' }} className={props.className} ref={ref} />
}
