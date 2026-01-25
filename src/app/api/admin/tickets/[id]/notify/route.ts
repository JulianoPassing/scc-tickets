import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategoryWithCorretor } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendDiscordDM, createTicketNotificationEmbed } from '@/lib/discord'
import { hasCorretorRole } from '@/lib/discord-roles'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Enviar notificação ao usuário via Discord
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão (incluindo verificação de cargo Corretor para CASAS)
    const hasCorretor = session.discordId ? await hasCorretorRole(session.discordId) : false
    if (!await canAccessCategoryWithCorretor(session.role, ticket.category, session.discordId, hasCorretor)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const result = await sendDiscordDM(
      ticket.user.discordId,
      createTicketNotificationEmbed('ticket_updated', {
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        subject: ticket.subject,
        url: `${baseUrl}/tickets/${ticket.id}`,
      })
    )

    if (result.success) {
      // Adicionar mensagem de sistema no ticket
      await prisma.message.create({
        data: {
          content: `📨 Notificação enviada ao usuário via Discord por ${session.name}`,
          ticketId: id,
          isSystemMessage: true,
        },
      })

      return NextResponse.json({ success: true, message: 'Notificação enviada' })
    } else {
      // Tratar erros específicos
      if (result.error === 'dm_disabled') {
        return NextResponse.json(
          { error: 'O usuário desabilitou DMs ou bloqueou o bot', code: 'dm_disabled' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Não foi possível enviar a notificação' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erro ao notificar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
