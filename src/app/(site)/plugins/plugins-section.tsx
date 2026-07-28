import type { Plugin } from '@/services/firebase'
import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import { PluginsClient } from './plugins-client'
import styles from './plugins.module.scss'

type Props = {
	initialPlugins: Plugin[]
}

export function PluginsSection({ initialPlugins }: Props) {
	return (
		<Page>
			<PageHeader
				title='Community Plugins'
				subtitle='Extend Void Presence with community-made plugins. Install in one click.'
			/>

			<section className={styles.section_themes_panel}>
				<div className={styles.themes_panel}>
					<PluginsClient initialPlugins={initialPlugins} />
				</div>
			</section>

			<Footer />
		</Page>
	)
}
