import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Status } from '@service/firebase'
import { StatusClient } from './statuses-client'
import styles from './statuses.module.scss'

type Props = {
	initialSearchTerm: string
	initialStatuses: Status[]
	initialTotal: number
	initialLimit: number
}

export function StatusSection({
	initialSearchTerm,
	initialStatuses,
	initialTotal,
	initialLimit,
}: Props) {
	return (
		<Page>
			<PageHeader
				title='Pick a Status!'
				subtitle='Browse community custom Discord Rich Presence statuses'
			/>

			<section className={styles.section_themes_panel}>
				<div className={styles.themes_panel}>
					<StatusClient
						initialStatuses={initialStatuses}
						initialSearchTerm={initialSearchTerm}
						initialTotal={initialTotal}
						initialLimit={initialLimit}
					/>
				</div>
			</section>

			<Footer />
		</Page>
	)
}
