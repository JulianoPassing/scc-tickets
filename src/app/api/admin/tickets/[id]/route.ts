import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendDiscordDM, createTicketNotificationEmbed } from '@/lib/discord'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Obter ticket específico (admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            discordId: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, role: true },
        },
        messages: {
          include: {
            user: {
              select: { username: true, displayName: true, avatar: true },
            },
            staff: {
              select: { name: true, role: true, avatar: true },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão
    if (!canAccessCategory(session.role, ticket.category)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Buscar o último atendente que enviou mensagem no ticket
    const lastStaffMessage = await prisma.message.findFirst({
      where: {
        ticketId: id,
        staffId: { not: null },
      },
      include: {
        staff: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Criar objeto de resposta com o último atendente
    const ticketResponse = {
      ...ticket,
      lastAttendant: lastStaffMessage?.staff || null,
    }

    return NextResponse.json({ ticket: ticketResponse })
  } catch (error) {
    console.error('Erro ao buscar ticket:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Atualizar ticket (admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { status, subject, assignedToId, closedReason } = body

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão
    if (!canAccessCategory(session.role, ticket.category)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const updateData: any = {}

    if (status) updateData.status = status
    if (subject) updateData.subject = subject
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null
    
    if (status === 'FECHADO') {
      updateData.closedAt = new Date()
      updateData.closedReason = closedReason || 'Fechado pelo atendente'

      // Criar mensagem do sistema pedindo avaliação
      const evaluationLink = 'https://discord.com/channels/1046404063287332936/1394727160991842324'
      await prisma.message.create({
        data: {
          ticketId: id,
          content: `🔒 **Ticket encerrado por ${session.name}**\n\n⭐ Sua avaliação é muito importante para nós! Por favor, avalie seu atendimento:\n${evaluationLink}\n\nObrigado por utilizar nosso sistema de suporte!`,
          isSystemMessage: true,
        },
      })

      // Enviar DM ao usuário pedindo avaliação
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      await sendDiscordDM(
        ticket.user.discordId,
        createTicketNotificationEmbed('ticket_closed', {
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          subject: ticket.subject,
          staffName: session.name,
          url: `${baseUrl}/tickets/${ticket.id}`,
          evaluationLink: evaluationLink,
        })
      )
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        assignedTo: true,
      },
    })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('Erro ao atualizar ticket:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
