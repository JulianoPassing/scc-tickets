import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Sinalizar ticket para um ou mais cargos
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { roles, message } = body // roles é um array de cargos

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: 'Pelo menos um cargo é obrigatório' }, { status: 400 })
    }

    // Verificar se o ticket existe
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão
    if (!canAccessCategory(session.role, ticket.category)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar se os cargos selecionados têm acesso à categoria
    const validRoles = roles.filter((role: string) => {
      const permissions = ROLE_PERMISSIONS[role]
      return permissions?.includes(ticket.category)
    })

    if (validRoles.length === 0) {
      return NextResponse.json({ error: 'Nenhum cargo selecionado tem acesso a esta categoria' }, { status: 400 })
    }

    // Criar sinalizações para cada cargo
    const createdFlags = []
    for (const role of validRoles) {
      const flag = await prisma.ticketFlag.upsert({
        where: {
          ticketId_flaggedToRole: {
            ticketId: id,
            flaggedToRole: role,
          },
        },
        update: {
          message: message || null,
          resolved: false,
          resolvedAt: null,
          flaggedById: session.staffId,
          createdAt: new Date(),
        },
        create: {
          ticketId: id,
          flaggedById: session.staffId,
          flaggedToRole: role,
          message: message || null,
        },
        include: {
          flaggedBy: {
            select: { name: true, role: true },
          },
        },
      })
      createdFlags.push(flag)
    }

    // Adicionar mensagem de sistema no ticket
    const roleNames = validRoles.map((r: string) => ROLE_LABELS[r] || r).join(', ')
    await prisma.message.create({
      data: {
        ticketId: id,
        content: `🚩 ${session.name} sinalizou este ticket para: ${roleNames}${message ? ` - "${message}"` : ''}`,
        isSystemMessage: true,
      },
    })

    return NextResponse.json({ flags: createdFlags, success: true })
  } catch (error) {
    console.error('Erro ao sinalizar ticket:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Obter sinalizações do ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const flags = await prisma.ticketFlag.findMany({
      where: { ticketId: id },
      select: {
        id: true,
        message: true,
        resolved: true,
        createdAt: true,
        flaggedToRole: true,
        flaggedBy: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('Erro ao buscar sinalizações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Resolver sinalização
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Resolver a sinalização do cargo do atendente atual para este ticket
    const flag = await prisma.ticketFlag.updateMany({
      where: {
        ticketId: id,
        flaggedToRole: session.role as any,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, updated: flag.count })
  } catch (error) {
    console.error('Erro ao resolver sinalização:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
