import { NextResponse } from 'next/server'
import { getAdminSession, canAccessCategoryWithCorretor } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { hasCorretorRole } from '@/lib/discord-roles'

// Listar tickets sinalizados para o cargo do atendente atual
export async function GET() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar sinalizações não resolvidas para o cargo do atendente atual
    const flags = await prisma.ticketFlag.findMany({
      where: {
        flaggedToRole: session.role as any,
        resolved: false,
      },
      include: {
        ticket: {
          include: {
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
        },
        flaggedBy: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Verificar cargo Corretor uma vez
    const hasCorretor = session.discordId ? await hasCorretorRole(session.discordId) : false

    // Filtrar por permissão do cargo e formatar resposta
    const tickets = await Promise.all(
      flags
        .map(async (flag) => {
          const hasAccess = await canAccessCategoryWithCorretor(
            session.role,
            flag.ticket.category,
            session.discordId,
            hasCorretor
          )
          if (!hasAccess) return null
          
          return {
            ...flag.ticket,
            flaggedBy: flag.flaggedBy,
            flaggedToRole: flag.flaggedToRole,
            flagMessage: flag.message,
            flaggedAt: flag.createdAt,
          }
        })
    )
    const validTickets = tickets.filter(t => t !== null)

    return NextResponse.json({ tickets: validTickets })
  } catch (error) {
    console.error('Erro ao listar tickets sinalizados:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
