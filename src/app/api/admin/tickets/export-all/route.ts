import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, ROLE_PERMISSIONS } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateTranscriptHTML } from '@/lib/export-transcript'
import archiver from 'archiver'
import { Readable } from 'stream'

// Exportar todos os tickets em ZIP
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter filtro de status da query string
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all' // all, abertos, fechados

    // Buscar todos os tickets que o staff tem acesso
    const allowedCategories = ROLE_PERMISSIONS[session.role] || []
    
    // Construir filtro de status
    const statusWhere: any = {}
    if (statusFilter === 'abertos') {
      statusWhere.status = { not: 'FECHADO' }
    } else if (statusFilter === 'fechados') {
      statusWhere.status = 'FECHADO'
    }
    
    const tickets = await prisma.ticket.findMany({
      where: {
        category: {
          in: allowedCategories as any,
        },
        ...statusWhere,
      },
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
      orderBy: {
        ticketNumber: 'asc',
      },
    })

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'Nenhum ticket encontrado' }, { status: 404 })
    }

    // Criar ZIP em memória
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    // Promise para aguardar finalização
    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      archive.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      archive.on('error', (err) => {
        reject(err)
      })
    })

    // Gerar HTML para cada ticket
    for (const ticket of tickets) {
      const html = generateTranscriptHTML(ticket)
      const filename = `ticket-${ticket.ticketNumber}-${ticket.subject.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50)}.html`
      archive.append(html, { name: filename })
    }

    await archive.finalize()
    const zipBuffer = await archivePromise

    // Nome do arquivo baseado no filtro
    const statusLabel = statusFilter === 'abertos' ? 'abertos' : statusFilter === 'fechados' ? 'fechados' : 'todos'
    const filename = `tickets-${statusLabel}-${new Date().toISOString().split('T')[0]}.zip`

    // Retornar ZIP
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Erro ao exportar tickets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
