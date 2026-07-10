'use client'

import styles from './footer.module.scss'

type Link = { label: string; href: string }

const MAIN_SITE_ORIGIN = 'https://voidpresence.site'

const SOCIAL: Link[] = [
	{ label: 'Discord', href: 'https://discord.gg/xHJrCNA8y5' },
	{ label: 'GitHub', href: 'https://github.com/Devollox/void-presence' },
]

const PRODUCT: Link[] = [
	{ label: 'Download client', href: '/download' },
	{ label: 'Profiles and cycles', href: '/configs' },
]

const RESOURCES: Link[] = [
	{ label: 'Docs', href: '/docs' },
	{ label: 'Status', href: '/status' },
	{ label: 'API', href: '/api' },
]

const META: Link[] = [
	{
		label: 'Changelog',
		href: 'https://github.com/Devollox/void-presence/releases',
	},
	{ label: 'Repository', href: 'https://github.com/Devollox/void-presence' },
]

function resolveInternalHref(link: Link) {
	if (link.href.startsWith('http')) return link.href
	return `${MAIN_SITE_ORIGIN}${link.href}`
}

const Footer = () => {
	const year = new Date().getFullYear()

	return (
		<footer className={styles.footer_container}>
			<div className={styles.footer_glow} />

			<div className={styles.footer_inner}>
				<div className={styles.footer_grid}>
					<div className={styles.footer_brand_column}>
						<div className={styles.footer_brand_header}>
							<div className={styles.footer_logo_circle}>
								<span className={styles.footer_logo_accent} />
								<span className={styles.footer_logo_text}>vP</span>
							</div>
							<div>
								<h3 className={styles.footer_brand_title}>Void Presence</h3>
								<p className={styles.footer_brand_text}>
									Advanced Discord Rich Presence manager with profiles, cycles, buttons and images.
								</p>
							</div>
						</div>

						<div className={styles.footer_social_row}>
							{SOCIAL.map(link => (
								<a
									key={link.href}
									href={link.href}
									target='_blank'
									rel='noreferrer'
									className={styles.footer_social_button}
								>
									<span className={styles.footer_social_label}>{link.label}</span>
								</a>
							))}
						</div>

						<div className={styles.footer_made_row}>
							<span>Built with focus by</span>
							<span className={styles.footer_made_dot}>●</span>
							<span>devollox</span>
						</div>
					</div>

					<div className={styles.footer_links_column}>
						<div className={styles.footer_links_group}>
							<h4 className={styles.footer_group_title}>Product</h4>
							<ul className={styles.footer_links_list}>
								{PRODUCT.map(link => (
									<li key={link.href}>
										<a href={resolveInternalHref(link)} className={styles.footer_link_item}>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						<div className={styles.footer_links_group}>
							<h4 className={styles.footer_group_title}>Resources</h4>
							<ul className={styles.footer_links_list}>
								{RESOURCES.map(link => (
									<li key={link.href}>
										<a href={resolveInternalHref(link)} className={styles.footer_link_item}>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						<div className={styles.footer_links_group}>
							<h4 className={styles.footer_group_title}>Meta</h4>
							<ul className={styles.footer_links_list}>
								{META.map(link => (
									<li key={link.href}>
										<a href={link.href} className={styles.footer_link_item}>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				<div className={styles.footer_bottom_bar}>
					<div className={styles.footer_bottom_text}>
						<div>© {year} Void Presence. All rights reserved.</div>
						<div className={styles.footer_bottom_sub}>
							Desktop Discord presence client – profiles, cycles, buttons and images in one place.
						</div>
					</div>

					<div className={styles.footer_bottom_meta}>
						<span className={styles.footer_chip}>Electron · React</span>
						<span className={styles.footer_chip}>Rich Presence</span>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
