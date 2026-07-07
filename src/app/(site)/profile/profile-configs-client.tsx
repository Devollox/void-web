'use client'

import { PresenceGrid } from '@/components/activity-grid/presence'
import { StatusesGrid } from '@/components/activity-grid/statuses'
import type { Config, Status } from '@/service/firebase'
import { CheckCircle2, Search, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './profile-configs.module.scss'

type Props = {
	userId: string
	initialConfigs?: Config[]
	initialStatuses?: Status[]
}

type AuthorConfigsResponse = {
	user: {
		id: string
		name: string | null
		avatar: string | null
		provider: string | null
		createdAt: number | null
		lastSeen: number | null
	} | null
	presenceConfigs: Config[]
	statusConfigs: Status[]
}

type ToastVariant = 'success' | 'error' | 'pending'

type ToastState = {
	open: boolean
	message: string
	variant: ToastVariant
}

function useToast() {
	const [toast, setToast] = useState<ToastState>({
		open: false,
		message: '',
		variant: 'success',
	})

	const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
		setToast({ open: true, message, variant })
		setTimeout(() => {
			setToast(prev => (prev.open ? { ...prev, open: false } : prev))
		}, 3000)
	}, [])

	const hideToast = useCallback(() => {
		setToast(prev => ({ ...prev, open: false }))
	}, [])

	const Toast = useCallback(() => {
		if (!toast.open) return null

		const isSuccess = toast.variant === 'success'
		const isError = toast.variant === 'error'
		const isPending = toast.variant === 'pending'

		return (
			<div className={styles.toast_portal}>
				<div
					className={`${styles.toast_root} ${
						isSuccess
							? styles.toast_root_success
							: isError
								? styles.toast_root_error
								: styles.toast_root_success
					}`}
				>
					<div className={styles.toast_icon_wrap}>
						{isSuccess ? (
							<CheckCircle2 className={styles.toast_icon_success} />
						) : isError ? (
							<XCircle className={styles.toast_icon_error} />
						) : (
							<CheckCircle2 className={styles.toast_icon_success} />
						)}
					</div>
					<div className={styles.toast_content}>
						<div className={styles.toast_title}>
							{isPending ? 'Deleting...' : isSuccess ? 'Deleted successfully' : 'Deletion failed'}
						</div>
						<div className={styles.toast_description}>{toast.message}</div>
					</div>
				</div>
			</div>
		)
	}, [toast, hideToast])

	return { Toast, showToast }
}

function filterConfigs(configs: Config[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return configs
	return configs.filter(
		config =>
			config.title.toLowerCase().includes(term) ||
			config.author.toLowerCase().includes(term) ||
			config.description.toLowerCase().includes(term)
	)
}

function filterStatuses(statuses: Status[], searchTerm: string) {
	const term = searchTerm.toLowerCase()
	if (!term) return statuses
	return statuses.filter(
		status =>
			status.title.toLowerCase().includes(term) || status.description.toLowerCase().includes(term)
	)
}

export function ProfileConfigsClient({ userId, initialConfigs = [], initialStatuses = [] }: Props) {
	const [searchTerm, setSearchTerm] = useState('')
	const [liveConfigs, setLiveConfigs] = useState<Config[]>(initialConfigs)
	const [liveStatuses, setLiveStatuses] = useState<Status[]>(initialStatuses)
	const [hasLoadedConfigs, setHasLoadedConfigs] = useState(initialConfigs.length > 0)
	const [hasLoadedStatuses, setHasLoadedStatuses] = useState(initialStatuses.length > 0)

	const loadingConfigs = !hasLoadedConfigs
	const loadingStatuses = !hasLoadedStatuses

	const { Toast, showToast } = useToast()

	useEffect(() => {
		let cancelled = false
		let eventSource: EventSource | null = null
		let hideLoadingTimeoutConfigs: ReturnType<typeof setTimeout> | null = null
		let hideLoadingTimeoutStatuses: ReturnType<typeof setTimeout> | null = null

		function finishLoadingConfigs() {
			if (hideLoadingTimeoutConfigs) clearTimeout(hideLoadingTimeoutConfigs)
			hideLoadingTimeoutConfigs = setTimeout(() => {
				if (!cancelled) setHasLoadedConfigs(true)
			}, 100)
		}

		function finishLoadingStatuses() {
			if (hideLoadingTimeoutStatuses) clearTimeout(hideLoadingTimeoutStatuses)
			hideLoadingTimeoutStatuses = setTimeout(() => {
				if (!cancelled) setHasLoadedStatuses(true)
			}, 100)
		}

		async function loadInitialAuthorConfigs() {
			if (initialConfigs.length > 0 || initialStatuses.length > 0) {
				finishLoadingConfigs()
				finishLoadingStatuses()
				return true
			}

			try {
				const res = await fetch(`/api/v1/authors/${encodeURIComponent(String(userId))}/configs`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!res.ok) {
					if (cancelled) return false
					setLiveConfigs([])
					setLiveStatuses([])
					finishLoadingConfigs()
					finishLoadingStatuses()
					return false
				}

				const data = (await res.json()) as AuthorConfigsResponse
				if (cancelled) return false

				setLiveConfigs(data.presenceConfigs || [])
				setLiveStatuses(data.statusConfigs || [])
				finishLoadingConfigs()
				finishLoadingStatuses()
				return true
			} catch {
				if (cancelled) return false
				setLiveConfigs([])
				setLiveStatuses([])
				finishLoadingConfigs()
				finishLoadingStatuses()
				return false
			}
		}

		async function startStream() {
			const ok = await loadInitialAuthorConfigs()
			if (!ok || cancelled) return

			eventSource = new EventSource(`/api/v1/authors/${encodeURIComponent(String(userId))}/stream`)

			eventSource.addEventListener('ready', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
			})

			eventSource.addEventListener('profile-update', event => {
				if (cancelled) return
				const next = JSON.parse((event as MessageEvent).data) as AuthorConfigsResponse
				setLiveConfigs(next.presenceConfigs || [])
				setLiveStatuses(next.statusConfigs || [])
			})

			eventSource.addEventListener('downloads', event => {
				if (cancelled) return
				const { id, kind, downloads } = JSON.parse((event as MessageEvent).data) as {
					id: string
					kind: 'presence' | 'status'
					downloads: number
				}

				if (kind === 'presence') {
					setLiveConfigs(prev => prev.map(c => (c.id === id ? { ...c, downloads } : c)))
				} else {
					setLiveStatuses(prev => prev.map(s => (s.id === id ? { ...s, downloads } : s)))
				}
			})

			eventSource.addEventListener('not-found', () => {
				if (cancelled) return
				setLiveConfigs([])
				setLiveStatuses([])
			})
		}

		startStream()

		return () => {
			cancelled = true
			eventSource?.close()
			if (hideLoadingTimeoutConfigs) clearTimeout(hideLoadingTimeoutConfigs)
			if (hideLoadingTimeoutStatuses) clearTimeout(hideLoadingTimeoutStatuses)
		}
	}, [userId, initialConfigs, initialStatuses])

	const filteredConfigs = useMemo(
		() => filterConfigs(liveConfigs, searchTerm),
		[liveConfigs, searchTerm]
	)

	const filteredStatuses = useMemo(
		() => filterStatuses(liveStatuses, searchTerm),
		[liveStatuses, searchTerm]
	)

	const handleDeleteStart = useCallback(
		(title?: string) => {
			showToast(title ? `Deleting “${title}”...` : 'Deleting config...', 'pending')
		},
		[showToast]
	)

	const handleDeleteSuccess = useCallback(
		(title?: string) => {
			showToast(title ? `“${title}” was deleted.` : 'Config was deleted.', 'success')
		},
		[showToast]
	)

	const handleDeleteError = useCallback(
		(message?: string) => {
			showToast(message || 'Could not delete config. Please try again.', 'error')
		},
		[showToast]
	)

	return (
		<>
			<section className={styles.profile_section}>
				<div className={styles.profile_configs_layout}>
					<div className={styles.profile_header_row}>
						<div className={styles.profile_header_title}>Your configs</div>
					</div>

					<form className={styles.profile_search_container} onSubmit={e => e.preventDefault()}>
						<Search className={styles.profile_search_icon} />
						<input
							className={styles.search}
							type='text'
							placeholder='Search by title or description...'
							name='q'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
						{searchTerm && (
							<button
								type='button'
								className={styles.search_clear_btn}
								onClick={() => setSearchTerm('')}
							>
								<X size={16} />
							</button>
						)}
					</form>

					<div className={styles.profile_stats_row}>
						<span>{filteredConfigs.length} presence found</span>
					</div>
					<div className={styles.profile_stats_row}>
						<span>{filteredStatuses.length} statuses found</span>
					</div>

					<div className={styles.themes_right_side}>
						<PresenceGrid
							configs={filteredConfigs}
							loading={loadingConfigs}
							allowDelete={true}
							forceOwnerMode={true}
							onDeleteStart={handleDeleteStart}
							onDeleteSuccess={handleDeleteSuccess}
							onDeleteError={handleDeleteError}
						/>
						<div style={{ marginTop: '20px' }} />
						<StatusesGrid
							configs={filteredStatuses}
							loading={loadingStatuses}
							allowDelete={true}
							forceOwnerMode={true}
							onDeleteStart={handleDeleteStart}
							onDeleteSuccess={handleDeleteSuccess}
							onDeleteError={handleDeleteError}
						/>
					</div>
				</div>
			</section>

			<Toast />
		</>
	)
}
