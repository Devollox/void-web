import Footer from '@components/footer'
import Page from '@components/page'
import config from '@data/config.json'
import PageHomeClient from './page-home-client'

export default function PageHome() {
	return (
		<Page home={true}>
			<PageHomeClient config={config} />
			<section style={{ scrollSnapAlign: 'start' }}>
				<Footer />
			</section>
		</Page>
	)
}
