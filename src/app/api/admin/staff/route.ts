import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Listar todos os atendentes ativos (para sinalizar)
export async function GET() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const staff = await prisma.staff.findMany({
      where: { active: true },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    // Remover o próprio usuário da lista
    const filteredStaff = staff.filter(s => s.id !== session.staffId)

    return NextResponse.json({ staff: filteredStaff })
  } catch (error) {
    console.error('Erro ao listar atendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
