import { encryptUserId } from '@/lib/crypto'
import { admin } from '@/service/firebase-admin'
import { UpstashRedisAdapter } from '@auth/upstash-redis-adapter'
import { redis } from '@service/redis'
import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import SteamProvider from 'steam-next-auth'

export const { handlers, auth, signIn, signOut } = NextAuth(req => {
	const host = req?.headers.get('host') || 'voidpresence.site'
	const protocol = host.includes('localhost') ? 'http://' : 'https://'
	const steamReq = req ?? new Request(`${protocol}${host}`)

	return {
		adapter: UpstashRedisAdapter(redis),
		providers: [
			GitHub({
				clientId: process.env.GITHUB_ID!,
				clientSecret: process.env.GITHUB_SECRET!,
				authorization: {
					params: {
						scope: 'read:user user:email',
						prompt: 'select_account',
					},
				},
				allowDangerousEmailAccountLinking: true,
			}),
			Google({
				clientId: process.env.GOOGLE_ID!,
				clientSecret: process.env.GOOGLE_SECRET!,
				authorization: {
					params: {
						scope: 'openid email profile',
						prompt: 'select_account',
					},
				},
				allowDangerousEmailAccountLinking: true,
			}),
			DiscordProvider({
				clientId: process.env.DISCORD_CLIENT_ID!,
				clientSecret: process.env.DISCORD_CLIENT_SECRET!,
				authorization: {
					params: {
						scope: 'identify email',
					},
				},
				allowDangerousEmailAccountLinking: true,
				profile(profile) {
					const encryptedToken = encryptUserId(String(profile.id))
					let avatarUrl = '/logo.png'

					if (profile.avatar) {
						avatarUrl = `/api/auth/avatars/${encodeURIComponent(encryptedToken)}`
					}

					return {
						id: String(profile.id),
						name: profile.username,
						email: profile.email,
						image: avatarUrl,
						emailVerified: profile.verified ? new Date() : null,
					}
				},
			}),
			SteamProvider(steamReq, {
				clientSecret: process.env.NEXTAUTH_STEAM_SECRET!,
				callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/fuckoffnextauth`,
			}),
		],
		session: {
			strategy: 'jwt',
		},
		pages: {
			signIn: '/signin',
		},
		callbacks: {
			async jwt({ token, account, user, profile }) {
				if (account && (user || profile)) {
					token.accessToken = (account as any).access_token
					token.provider = account.provider

					let stableId = ''

					if (account.provider === 'github') {
						stableId = String((profile as any)?.id || user?.id || '')
					} else if (account.provider === 'google') {
						stableId = String((profile as any)?.sub || user?.id || '')
					} else if (account.provider === 'steam') {
						stableId = String((profile as any)?.steamid || user?.id || '')
					} else if (account.provider === 'discord') {
						stableId = String((profile as any)?.id || user?.id || '')
					}

					token.id = stableId.trim() || String(user?.id || token.sub || '')
				}

				if (token.id) {
					try {
						token.firebaseToken = await admin.auth().createCustomToken(String(token.id))
					} catch {}
				}

				return token
			},
			async session({ session, token }) {
				session.accessToken = (token as any).accessToken
				;(session as any).firebaseToken = (token as any).firebaseToken
				;(session as any).provider = (token as any).provider

				if (session.user) {
					;(session.user as any).id = String(token.id || token.sub || '')
					;(session.user as any).provider = (session as any).provider
				}

				return session
			},
		},
	}
})

export const { GET, POST } = handlers
