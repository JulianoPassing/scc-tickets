import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Obter ticket específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        userId: session.user.id, // Garante que só vê seus próprios tickets
      },
      include: {
        user: true,
        assignedTo: {
          select: { name: true, role: true },
        },
        messages: {
          where: {
            staffOnly: false, // Não mostrar mensagens exclusivas da staff
          },
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

    // Verificar se há sinalizações ativas para este ticket (sem expor detalhes)
    const flagCount = await prisma.ticketFlag.count({
      where: { ticketId: id, resolved: false }
    })

    return NextResponse.json({ 
      ticket,
      isFlagged: flagCount > 0  // Apenas indica que foi sinalizado, sem expor mensagem
    })
  } catch (error) {
    console.error('Erro ao buscar ticket:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
