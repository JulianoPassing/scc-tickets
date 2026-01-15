import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategory } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Sinalizar ticket para um atendente específico
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { staffId, message } = body

    if (!staffId) {
      return NextResponse.json({ error: 'Atendente é obrigatório' }, { status: 400 })
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

    // Buscar ou criar o staff no banco (pode não existir ainda se nunca logou)
    let targetStaff = await prisma.staff.findFirst({
      where: { username: staffId }, // staffId é o Discord ID
    })

    if (!targetStaff) {
      return NextResponse.json({ error: 'Atendente não encontrado no sistema' }, { status: 404 })
    }

    // Verificar se o atendente tem acesso à categoria
    if (!canAccessCategory(targetStaff.role, ticket.category)) {
      return NextResponse.json({ error: 'Atendente não tem acesso a esta categoria' }, { status: 400 })
    }

    // Criar ou atualizar sinalização (upsert para evitar duplicatas)
    const flag = await prisma.ticketFlag.upsert({
      where: {
        ticketId_flaggedToId: {
          ticketId: id,
          flaggedToId: targetStaff.id,
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
        flaggedToId: targetStaff.id,
        message: message || null,
      },
      include: {
        flaggedBy: {
          select: { name: true, role: true },
        },
        flaggedTo: {
          select: { name: true, role: true, avatar: true },
        },
      },
    })

    // Adicionar mensagem de sistema no ticket
    await prisma.message.create({
      data: {
        ticketId: id,
        content: `🚩 ${session.name} sinalizou este ticket para ${targetStaff.name}${message ? `: "${message}"` : ''}`,
        isSystemMessage: true,
      },
    })

    return NextResponse.json({ flag, success: true })
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
        flaggedBy: {
          select: { id: true, name: true, role: true, avatar: true },
        },
        flaggedTo: {
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

    // Resolver a sinalização do atendente atual para este ticket
    const flag = await prisma.ticketFlag.updateMany({
      where: {
        ticketId: id,
        flaggedToId: session.staffId,
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
