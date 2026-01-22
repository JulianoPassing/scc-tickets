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
    const search = searchParams.get('search')

    // Construir condições de busca
    const searchConditions = search
      ? {
          OR: [
            { subject: { contains: search, mode: 'insensitive' as const } },
            {
              user: {
                OR: [
                  { displayName: { contains: search, mode: 'insensitive' as const } },
                  { username: { contains: search, mode: 'insensitive' as const } },
                  { discordId: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            },
          ],
        }
      : {}

    // Buscar todos os tickets e filtrar por permissão
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status && { status }),
        ...(category && { category: category as any }),
        ...searchConditions,
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

    // Buscar o último atendente que respondeu em cada ticket
    const ticketIds = tickets.map(t => t.id)
    const lastStaffMessages = await prisma.message.findMany({
      where: {
        ticketId: { in: ticketIds },
        staffId: { not: null },
      },
      select: {
        ticketId: true,
        staff: {
          select: { id: true, name: true, role: true, avatar: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Agrupar por ticketId e pegar apenas a última mensagem de cada ticket
    const lastAttendantsMap = new Map<string, typeof lastStaffMessages[0]>()
    for (const msg of lastStaffMessages) {
      if (!lastAttendantsMap.has(msg.ticketId)) {
        lastAttendantsMap.set(msg.ticketId, msg)
      }
    }

    // Filtrar por permissão do cargo e adicionar último atendente
    const filteredTickets = tickets
      .filter((ticket) => canAccessCategory(session.role, ticket.category))
      .map((ticket) => {
        const lastMessage = lastAttendantsMap.get(ticket.id)
        return {
          ...ticket,
          lastAttendant: lastMessage?.staff || null,
        }
      })

    return NextResponse.json({ tickets: filteredTickets })
  } catch (error) {
    console.error('Erro ao listar tickets admin:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
