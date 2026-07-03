'use client'

import { FormEvent, useState } from 'react'
import styles from './config-details.module.scss'

type Props = {
	configId: string
}

export function CopyJsonButton({ configId }: Props) {
	const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault()
		try {
			const res = await fetch(`/api/v1/presence/${configId}/copy`, {
				method: 'GET',
			})
			if (!res.ok) {
				throw new Error('Request failed')
			}
			const data = await res.json()
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
			setStatus('copied')
			setTimeout(() => setStatus('idle'), 2000)
		} catch {
			setStatus('error')
			setTimeout(() => setStatus('idle'), 2000)
		}
		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'presence_download', id: configId }),
			})
		} catch (err) {
			console.error('Failed to track open in app', err)
		}
	}

	return (
		<form onSubmit={onSubmit}>
			<button type='submit' className={styles.action_btn_secondary}>
				<span>{status === 'copied' ? 'Copied!' : status === 'error' ? 'Error' : 'Copy JSON'}</span>
				<span className={styles.action_btn_hint}>to clipboard</span>
			</button>
		</form>
	)
}
