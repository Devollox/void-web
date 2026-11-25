import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DesktopConnectPage({ searchParams }: Props) {
	const params = await searchParams
	const query = new URLSearchParams()

	for (const key of ['state', 'code_challenge', 'code_challenge_method', 'redirect_uri']) {
		const value = params[key]

		if (typeof value === 'string') {
			query.set(key, value)
		}
	}

	redirect(`/api/auth/desktop/connect?${query.toString()}`)
}
