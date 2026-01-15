import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendDiscordDM, createTicketNotificationEmbed } from '@/lib/discord'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AttachmentInput {
  url: string
  filename: string
  mimeType: string
}

// Enviar mensagem no ticket (admin/staff)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { content, notifyUser, attachments } = await request.json() as {
      content?: string
      notifyUser?: boolean
      attachments?: AttachmentInput[]
    }

    // Precisa ter conteúdo ou anexos
    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Mensagem ou anexo é obrigatório' }, { status: 400 })
    }

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

    // Criar mensagem com anexos
    const message = await prisma.message.create({
      data: {
        content: content?.trim() || '',
        ticketId: id,
        staffId: session.staffId,
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map(att => ({
            filename: att.filename,
            url: att.url,
            mimeType: att.mimeType,
            size: 0,
          }))
        } : undefined,
      },
      include: {
        staff: {
          select: { name: true, role: true },
        },
        attachments: true,
      },
    })

    // Atualizar ticket
    await prisma.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: 'EM_ATENDIMENTO',
        assignedToId: ticket.assignedToId || session.staffId,
      },
    })

    // Enviar DM ao usuário se solicitado
    if (notifyUser) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      await sendDiscordDM(
        ticket.user.discordId,
        createTicketNotificationEmbed('new_message', {
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          subject: ticket.subject,
          message: content || 'Nova mensagem com anexo',
          staffName: session.name,
          url: `${baseUrl}/tickets/${ticket.id}`,
        })
      )
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
