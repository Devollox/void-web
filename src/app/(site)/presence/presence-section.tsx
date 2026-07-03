import type { Config } from '@/app/(api)/api/v1/configs/route'
import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { ConfigsClient } from './presence-client'
import styles from './presence.module.scss'

type Props = {
	initialSearchTerm: string
	initialConfigs: Config[]
	initialOwnConfigIds: string[]
}

export function ConfigsSection({ initialSearchTerm, initialConfigs, initialOwnConfigIds }: Props) {
	return (
		<Page>
			<PageHeader
				title='Pick a Presence!'
				subtitle='Browse community Discord Rich Presence profiles'
			/>

			<section className={styles.section_themes_panel}>
				<div className={styles.themes_panel}>
					<ConfigsClient
						initialConfigs={initialConfigs}
						initialSearchTerm={initialSearchTerm}
						initialOwnConfigIds={initialOwnConfigIds}
					/>
				</div>
			</section>

			<Footer />
		</Page>
	)
}
