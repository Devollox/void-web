import { useInView, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'

type Direction = 'up' | 'down'

interface UseCountUpProps {
	to: number
	from?: number
	direction?: Direction
	delay?: number
	duration?: number
	startWhen?: boolean
	separator?: string
	onStart?: () => void
	onEnd?: () => void
}

export function useCountUp({
	to,
	from = 0,
	direction = 'up',
	delay = 0,
	duration = 2,
	startWhen = true,
	separator = '',
	onStart,
	onEnd,
}: UseCountUpProps) {
	const ref = useRef<HTMLSpanElement | null>(null)
	const motionValue = useMotionValue(direction === 'down' ? to : from)

	const damping = 20 + 40 * (1 / duration)
	const stiffness = 100 * (1 / duration)

	const springValue = useSpring(motionValue, { damping, stiffness })
	const isInView = useInView(ref, { once: true, margin: '0px' })

	const maxDecimals = useMemo(() => {
		const getDecimalPlaces = (num: number) => {
			const str = num.toString()
			if (str.includes('.')) {
				const decimals = str.split('.')[1] ?? ''
				if (parseInt(decimals, 10) !== 0) return decimals.length
			}
			return 0
		}
		return Math.max(getDecimalPlaces(from), getDecimalPlaces(to))
	}, [from, to])

	useEffect(() => {
		motionValue.set(direction === 'down' ? to : from)
	}, [direction, from, to, motionValue])

	useEffect(() => {
		if (!isInView || !startWhen) return

		onStart?.()

		const startValue = direction === 'down' ? from : to
		const timeoutId = setTimeout(() => {
			motionValue.set(startValue)
		}, delay * 1000)

		const durationTimeoutId = setTimeout(
			() => {
				onEnd?.()
			},
			(delay + duration) * 1000
		)

		return () => {
			clearTimeout(timeoutId)
			clearTimeout(durationTimeoutId)
		}
	}, [isInView, startWhen, direction, from, to, delay, duration, motionValue, onStart, onEnd])

	const formatted = useRef<string>(String(direction === 'down' ? to : from))

	useEffect(() => {
		const unsub = springValue.on('change', latest => {
			const hasDecimals = maxDecimals > 0
			const options: Intl.NumberFormatOptions = {
				useGrouping: !!separator,
				minimumFractionDigits: hasDecimals ? maxDecimals : 0,
				maximumFractionDigits: hasDecimals ? maxDecimals : 0,
			}

			const formattedNumber = Intl.NumberFormat('en-US', options).format(latest)
			formatted.current = separator ? formattedNumber.replace(/,/g, separator) : formattedNumber

			if (ref.current) {
				ref.current.textContent = formatted.current
			}
		})

		return () => unsub()
	}, [springValue, separator, maxDecimals])

	return { ref }
}
