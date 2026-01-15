import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AttachmentInput {
  url: string
  filename: string
  mimeType: string
}

// Enviar mensagem no ticket (usuário)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { content, attachments } = await request.json() as { 
      content?: string
      attachments?: AttachmentInput[] 
    }

    // Precisa ter conteúdo ou anexos
    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Mensagem ou anexo é obrigatório' }, { status: 400 })
    }

    // Verificar se o ticket pertence ao usuário
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: { not: 'FECHADO' },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado ou fechado' },
        { status: 404 }
      )
    }

    // Criar mensagem com anexos
    const message = await prisma.message.create({
      data: {
        content: content?.trim() || '',
        ticketId: id,
        userId: session.user.id,
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
        user: {
          select: { username: true, displayName: true, avatar: true },
        },
        attachments: true,
      },
    })

    // Atualizar timestamp do ticket
    await prisma.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: 'AGUARDANDO_RESPOSTA',
      },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
