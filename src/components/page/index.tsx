import { ReactNode } from 'react'
import Header from '../navbar/index'
import styles from './page.module.scss'

type PageProps = {
	children?: ReactNode
	home?: boolean
}

export default function Page({
	children,
	home = false,
	isApiHost,
}: PageProps & { isApiHost?: boolean }) {
	return (
		<>
			<Header isApiHost={isApiHost} />
			<main className={`${styles.main} ${home ? styles.home : styles.normal}`}>{children}</main>
		</>
	)
}
