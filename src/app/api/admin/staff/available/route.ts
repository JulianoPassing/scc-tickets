import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/permissions'

// Listar cargos disponíveis para sinalização baseado na categoria
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 })
    }

    // Determinar quais cargos têm acesso à categoria
    const availableRoles = Object.entries(ROLE_PERMISSIONS)
      .filter(([role, categories]) => {
        // Não pode sinalizar para o próprio cargo
        if (role === session.role) return false
        // Verificar se o cargo tem acesso à categoria
        return categories.includes(category)
      })
      .map(([role]) => ({
        id: role,
        name: ROLE_LABELS[role] || role,
      }))
      .sort((a, b) => {
        // Ordenar por prioridade (CEO/DEV primeiro)
        const priorityOrder = ['CEO', 'DEV', 'COMMUNITY_MANAGER', 'COORDENADOR', 'MODERADOR', 'SUPORTE', 'AJUDANTE']
        return priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id)
      })

    return NextResponse.json({ roles: availableRoles })
  } catch (error) {
    console.error('Erro ao listar cargos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
