import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategoryWithCorretor } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendDiscordDM, createTicketNotificationEmbed } from '@/lib/discord'
import { TicketCategory } from '@prisma/client'
import { hasCorretorRole } from '@/lib/discord-roles'

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

    // Verificar permissão (incluindo verificação de cargo Corretor para CASAS)
    const hasCorretor = session.discordId ? await hasCorretorRole(session.discordId) : false
    if (!await canAccessCategoryWithCorretor(session.role, ticket.category, session.discordId, hasCorretor)) {
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
    const { status, subject, assignedToId, closedReason, category } = body

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão para a categoria atual (incluindo verificação de cargo Corretor para CASAS)
    const hasCorretor = session.discordId ? await hasCorretorRole(session.discordId) : false
    if (!await canAccessCategoryWithCorretor(session.role, ticket.category, session.discordId, hasCorretor)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Se estiver alterando a categoria, verificar permissão para a nova categoria
    if (category && category !== ticket.category) {
      if (!await canAccessCategoryWithCorretor(session.role, category, session.discordId, hasCorretor)) {
        return NextResponse.json({ 
          error: 'Você não tem permissão para acessar esta categoria' 
        }, { status: 403 })
      }
    }

    const updateData: any = {}

    if (status) updateData.status = status
    if (subject) updateData.subject = subject
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null
    if (category) updateData.category = category as TicketCategory
    
    // Se a categoria foi alterada, criar mensagem do sistema
    if (category && category !== ticket.category) {
      const categoryNames: Record<string, string> = {
        SUPORTE: 'Suporte',
        BUGS: 'Reportar Bugs',
        DENUNCIAS: 'Denúncias',
        DOACOES: 'Doações',
        BOOST: 'Boost',
        CASAS: 'Casas',
        REVISAO: 'Revisão',
      }
      const oldCategoryName = categoryNames[ticket.category] || ticket.category
      const newCategoryName = categoryNames[category] || category
      
      await prisma.message.create({
        data: {
          ticketId: id,
          content: `📁 **Categoria alterada por ${session.name}**\n\nCategoria alterada de **${oldCategoryName}** para **${newCategoryName}**.`,
          isSystemMessage: true,
        },
      })
    }

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
          category: category || ticket.category,
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
