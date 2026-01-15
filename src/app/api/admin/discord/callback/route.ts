import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signAdminToken } from '@/lib/admin-auth'
import { DISCORD_GUILD_ID, getHighestRole, hasAllowedRole } from '@/lib/discord-roles'

interface DiscordUser {
  id: string
  username: string
  global_name?: string
  avatar?: string
}

interface GuildMember {
  roles: string[]
  nick?: string
}

// Callback do Discord OAuth2
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    console.error('Erro no OAuth Discord:', error)
    return NextResponse.redirect(`${baseUrl}/admin?error=discord_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin?error=no_code`)
  }

  try {
    // 1. Trocar código por token de acesso
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${baseUrl}/api/admin/discord/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Erro ao obter token Discord:', errorData)
      return NextResponse.redirect(`${baseUrl}/admin?error=token_failed`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 2. Obter dados do usuário
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Erro ao obter usuário Discord')
      return NextResponse.redirect(`${baseUrl}/admin?error=user_failed`)
    }

    const user: DiscordUser = await userResponse.json()

    // 3. Obter cargos do usuário no servidor
    const memberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!memberResponse.ok) {
      if (memberResponse.status === 404) {
        // Usuário não está no servidor
        return NextResponse.redirect(`${baseUrl}/admin?error=not_in_server`)
      }
      console.error('Erro ao obter membro do servidor:', memberResponse.status)
      return NextResponse.redirect(`${baseUrl}/admin?error=member_failed`)
    }

    const member: GuildMember = await memberResponse.json()

    // 4. Verificar se tem cargo permitido
    if (!hasAllowedRole(member.roles)) {
      return NextResponse.redirect(`${baseUrl}/admin?error=no_permission`)
    }

    // 5. Obter o cargo mais alto
    const systemRole = getHighestRole(member.roles)
    if (!systemRole) {
      return NextResponse.redirect(`${baseUrl}/admin?error=no_role`)
    }

    // 6. Criar token JWT
    const displayName = member.nick || user.global_name || user.username
    const token = await signAdminToken({
      staffId: user.id, // Usando Discord ID como staffId
      username: user.username,
      name: displayName,
      role: systemRole,
      discordId: user.id,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '',
    })

    // 7. Salvar cookie e redirecionar
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    })

    return NextResponse.redirect(`${baseUrl}/admin/dashboard`)
  } catch (error) {
    console.error('Erro no callback Discord:', error)
    return NextResponse.redirect(`${baseUrl}/admin?error=unknown`)
  }
}
