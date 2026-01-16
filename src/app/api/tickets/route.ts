import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TicketCategory, TicketStatus } from '@prisma/client'

// Listar tickets do usuário logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as TicketStatus | null

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        assignedTo: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Erro ao listar tickets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Criar novo ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { category, subject, message } = await request.json()

    if (!category || !subject || !message) {
      return NextResponse.json(
        { error: 'Categoria, assunto e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar categoria
    const validCategories = ['SUPORTE', 'BUGS', 'DENUNCIAS', 'DOACOES', 'BOOST', 'CASAS', 'REVISAO']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    // Verificar se já tem ticket aberto ou em atendimento na categoria
    // Só permite criar novo ticket quando o anterior estiver FECHADO
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        userId: session.user.id,
        category: category as TicketCategory,
        status: {
          in: [TicketStatus.ABERTO, TicketStatus.EM_ATENDIMENTO, TicketStatus.AGUARDANDO_RESPOSTA],
        },
      },
    })

    if (existingTicket) {
      const categoryLabels: Record<TicketCategory, string> = {
        SUPORTE: 'Suporte',
        BUGS: 'Reportar Bugs',
        DENUNCIAS: 'Denúncias',
        DOACOES: 'Doações',
        BOOST: 'Boost',
        CASAS: 'Casas',
        REVISAO: 'Revisão',
      }
      const categoryInfo = categoryLabels[category as TicketCategory] || category

      return NextResponse.json(
        { 
          error: `Você já possui um ticket aberto ou em atendimento na categoria "${categoryInfo}". Feche o ticket anterior antes de abrir um novo na mesma categoria.` 
        },
        { status: 400 }
      )
    }

    // Criar ticket com mensagem inicial
    const ticket = await prisma.ticket.create({
      data: {
        category: category as TicketCategory,
        subject,
        userId: session.user.id,
        messages: {
          create: {
            content: message,
            userId: session.user.id,
          },
        },
      },
      include: {
        user: true,
        messages: true,
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar ticket:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
