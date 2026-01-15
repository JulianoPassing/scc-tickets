import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'

// Listar tickets para admin (filtrado por cargo)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as TicketStatus | null
    const category = searchParams.get('category')

    // Buscar todos os tickets e filtrar por permissão
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status && { status }),
        ...(category && { category: category as any }),
      },
      select: {
        id: true,
        ticketNumber: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        closedReason: true,
        user: {
          select: { username: true, displayName: true, avatar: true, discordId: true },
        },
        assignedTo: {
          select: { name: true, role: true, avatar: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' },
      ],
    })

    // Filtrar por permissão do cargo
    const filteredTickets = tickets.filter((ticket) =>
      canAccessCategory(session.role, ticket.category)
    )

    return NextResponse.json({ tickets: filteredTickets })
  } catch (error) {
    console.error('Erro ao listar tickets admin:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
