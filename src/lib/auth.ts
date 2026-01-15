import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as {
          id: string
          username: string
          global_name?: string
          avatar?: string
          email?: string
        }

        // Criar ou atualizar usuário no banco
        await prisma.user.upsert({
          where: { discordId: discordProfile.id },
          update: {
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
          create: {
            discordId: discordProfile.id,
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
        })
      }
      return true
    },
    async jwt({ token, profile, account }) {
      if (profile && account?.provider === 'discord') {
        const discordProfile = profile as { id: string }
        token.discordId = discordProfile.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.discordId) {
        const dbUser = await prisma.user.findUnique({
          where: { discordId: token.discordId as string },
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.discordId = dbUser.discordId
          session.user.avatar = dbUser.avatar
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
