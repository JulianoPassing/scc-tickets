// Utilitários para integração com Discord

export interface DMResult {
  success: boolean
  error?: 'not_configured' | 'dm_disabled' | 'unknown'
}

export async function sendDiscordDM(userId: string, embed: DiscordEmbed): Promise<DMResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    console.error('DISCORD_BOT_TOKEN não configurado')
    return { success: false, error: 'not_configured' }
  }

  try {
    // Criar DM channel
    const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
    })

    if (!dmResponse.ok) {
      console.error('Erro ao criar DM channel:', await dmResponse.text())
      return { success: false, error: 'unknown' }
    }

    const dmChannel = await dmResponse.json()

    // Enviar mensagem
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}))
      console.error('Erro ao enviar DM:', JSON.stringify(errorData))
      
      // Código 50007 = Cannot send messages to this user (DMs desabilitadas)
      if (errorData.code === 50007) {
        return { success: false, error: 'dm_disabled' }
      }
      return { success: false, error: 'unknown' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao enviar DM:', error)
    return { success: false, error: 'unknown' }
  }
}

export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string; icon_url?: string }
  timestamp?: string
  thumbnail?: { url: string }
  author?: { name: string; icon_url?: string; url?: string }
}

export function createTicketNotificationEmbed(
  type: 'new_message' | 'ticket_closed' | 'ticket_updated',
  data: {
    ticketNumber: number
    category: string
    subject: string
    message?: string
    staffName?: string
    url: string
  }
): DiscordEmbed {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (type) {
    case 'new_message':
      return {
        title: '💬 Nova Mensagem no Ticket',
        description: `Você recebeu uma nova resposta no seu ticket.`,
        color: 0xeaf207,
        fields: [
          { name: 'Ticket', value: `#${data.ticketNumber}`, inline: true },
          { name: 'Categoria', value: data.category, inline: true },
          { name: 'Assunto', value: data.subject, inline: false },
          { name: 'Mensagem', value: data.message?.substring(0, 200) || 'Clique para ver', inline: false },
          { name: '🔗 Acessar', value: `[Clique aqui](${data.url})`, inline: false },
        ],
        footer: { text: 'StreetCarClub • Sistema de Tickets' },
        timestamp: new Date().toISOString(),
      }

    case 'ticket_closed':
      return {
        title: '🔒 Ticket Fechado',
        description: `Seu ticket foi fechado pela equipe.`,
        color: 0xff6b6b,
        fields: [
          { name: 'Ticket', value: `#${data.ticketNumber}`, inline: true },
          { name: 'Categoria', value: data.category, inline: true },
          { name: 'Fechado por', value: data.staffName || 'Staff', inline: true },
          { name: '📝 Avaliar', value: `[Avalie seu atendimento](${baseUrl}/avaliar)`, inline: false },
        ],
        footer: { text: 'StreetCarClub • Obrigado pelo contato!' },
        timestamp: new Date().toISOString(),
      }

    case 'ticket_updated':
      return {
        title: '🔔 Atualização no Ticket',
        description: `Seu ticket foi atualizado. Verifique as novidades.`,
        color: 0xffa500,
        fields: [
          { name: 'Ticket', value: `#${data.ticketNumber}`, inline: true },
          { name: 'Assunto', value: data.subject, inline: true },
          { name: '🔗 Acessar', value: `[Clique aqui](${data.url})`, inline: false },
        ],
        footer: { text: 'StreetCarClub • Sistema de Tickets' },
        timestamp: new Date().toISOString(),
      }

    default:
      return {}
  }
}
