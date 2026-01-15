import { NextResponse } from 'next/server'

// Inicia o fluxo de login com Discord OAuth2
export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/discord/callback`
  
  if (!clientId) {
    return NextResponse.json({ error: 'Discord não configurado' }, { status: 500 })
  }

  // Scopes necessários: identify (dados do usuário) e guilds.members.read (ver cargos)
  const scope = 'identify guilds.members.read'
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
  })

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`
  
  return NextResponse.redirect(discordAuthUrl)
}
