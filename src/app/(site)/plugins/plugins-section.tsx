import Footer from '@components/footer'
import Page from '@components/page'
import PageHeader from '@components/page-header'
import type { Plugin } from '@service/firebase'
import Link from 'next/link'
import { PluginsClient } from './plugins-client'
import styles from './plugins.module.scss'

type Props = {
	initialPlugins: Plugin[]
	initialTotal: number
}

export function PluginsSection({ initialPlugins, initialTotal }: Props) {
	return (
		<Page>
			<PageHeader
				title='Community Plugins'
				subtitle='Extend Void Presence with community-made plugins. Install in one click.'
				rightSlot={
					<Link href='/plugins/docs' className={styles.docs_link}>
						Build a plugin →
					</Link>
				}
			/>

			<section className={styles.section_themes_panel}>
				<div className={styles.themes_panel}>
					<PluginsClient initialPlugins={initialPlugins} initialTotal={initialTotal} />
				</div>
			</section>

			<Footer />
		</Page>
	)
}
