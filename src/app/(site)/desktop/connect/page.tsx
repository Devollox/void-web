import { redirect } from 'next/navigation'

export default function DesktopConnectPage() {
	redirect('/api/auth/desktop/connect')
}
