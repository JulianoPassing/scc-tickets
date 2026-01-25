import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, canAccessCategoryWithCorretor } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateTranscriptHTML } from '@/lib/export-transcript'
import { hasCorretorRole } from '@/lib/discord-roles'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Exportar transcript de um ticket individual
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAdminSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: true,
        assignedTo: true,
        messages: {
          include: {
            user: true,
            staff: true,
            attachments: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Verificar permissão (incluindo verificação de cargo Corretor para CASAS)
    const hasCorretor = session.discordId ? await hasCorretorRole(session.discordId) : false
    if (!await canAccessCategoryWithCorretor(session.role, ticket.category, session.discordId, hasCorretor)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Gerar HTML
    const html = generateTranscriptHTML(ticket)

    // Retornar como download
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="ticket-${ticket.ticketNumber}-transcript.html"`,
      },
    })
  } catch (error) {
    console.error('Erro ao exportar transcript:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
