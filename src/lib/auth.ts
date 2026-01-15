import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from './prisma'

// Servidor do Discord para verificar cargos e nickname
const DISCORD_GUILD_ID = '1046404063287332936'

// Cargos que podem abrir tickets
const ALLOWED_TICKET_ROLES = [
  '1317086939555434557', // Morador
  '1046404063660625922', // WL Rapida
  '1277776569389289562', // Abrir ticket
  '1349247196004089957', // Abrir ticket Warn
]

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
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

        // Buscar dados do membro no servidor para pegar nickname e verificar cargos
        let nickname = discordProfile.global_name || discordProfile.username
        let hasAllowedRole = false

        try {
          const memberResponse = await fetch(
            `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          )

          if (memberResponse.ok) {
            const member = await memberResponse.json()
            // Usar nickname do servidor se existir
            if (member.nick) {
              nickname = member.nick
            }
            // Verificar se tem cargo permitido
            hasAllowedRole = member.roles?.some((roleId: string) => 
              ALLOWED_TICKET_ROLES.includes(roleId)
            )
          }
        } catch (error) {
          console.error('Erro ao buscar dados do membro:', error)
        }

        // Se não tem cargo permitido, bloquear login
        if (!hasAllowedRole) {
          return '/login?error=no_permission'
        }

        // Criar ou atualizar usuário no banco
        await prisma.user.upsert({
          where: { discordId: discordProfile.id },
          update: {
            username: discordProfile.username,
            displayName: nickname,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
          create: {
            discordId: discordProfile.id,
            username: discordProfile.username,
            displayName: nickname,
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
