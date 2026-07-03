'use client'

import { FormEvent, useState } from 'react'
import styles from '../../presence/[id]/config-details.module.scss'

type Props = {
	configId: string
}

export function DownloadJsonButton({ configId }: Props) {
	const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle')

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setStatus('downloading')

		try {
			const res = await fetch(`/api/v1/configs/${configId}/download?kind=status`, {
				method: 'GET',
			})

			if (!res.ok) {
				throw new Error('Request failed')
			}

			const blob = await res.blob()
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `${configId}.json`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)

			setStatus('idle')
		} catch {
			setStatus('error')
			setTimeout(() => setStatus('idle'), 2000)
		}

		try {
			await fetch('/api/v1/analytics/configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'status_download', id: configId }),
			})
		} catch (err) {
			console.error('Failed to track open in app', err)
		}
	}

	return (
		<form onSubmit={onSubmit}>
			<button type='submit' className={styles.action_btn_primary}>
				<span>
					{status === 'downloading'
						? 'Downloading...'
						: status === 'error'
							? 'Error'
							: 'Download JSON'}
				</span>
				<span className={styles.action_btn_hint}>.json file</span>
			</button>
		</form>
	)
}
