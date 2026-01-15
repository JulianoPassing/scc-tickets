import { NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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

    // Filtrar por permissão do cargo e formatar resposta
    const tickets = flags
      .filter(flag => canAccessCategory(session.role, flag.ticket.category))
      .map(flag => ({
        ...flag.ticket,
        flaggedBy: flag.flaggedBy,
        flaggedToRole: flag.flaggedToRole,
        flagMessage: flag.message,
        flaggedAt: flag.createdAt,
      }))

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Erro ao listar tickets sinalizados:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
