import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { ROLE_PERMISSIONS } from '@/lib/permissions'
import { hasCorretorRole } from '@/lib/discord-roles'

// Retornar categorias permitidas para o usuário atual (incluindo verificação de cargo Corretor)
export async function GET() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter categorias base do cargo
    const baseCategories = ROLE_PERMISSIONS[session.role] || []
    
    // Verificar se tem cargo Corretor para adicionar CASAS
    let allowedCategories = [...baseCategories]
    
    if (session.discordId) {
      const hasCorretor = await hasCorretorRole(session.discordId)
      
      // Se tiver cargo Corretor e o cargo não for CM, DEV ou CEO, adicionar CASAS
      if (hasCorretor && 
          session.role !== 'COMMUNITY_MANAGER' && 
          session.role !== 'DEV' && 
          session.role !== 'CEO') {
        if (!allowedCategories.includes('CASAS')) {
          allowedCategories.push('CASAS')
        }
      }
    }

    // CM, DEV e CEO sempre têm CASAS (já está em ROLE_PERMISSIONS)
    
    return NextResponse.json({ categories: allowedCategories })
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
