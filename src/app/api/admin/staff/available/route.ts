import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { ROLE_PERMISSIONS } from '@/lib/permissions'
import { DISCORD_GUILD_ID, DISCORD_ROLE_MAP } from '@/lib/discord-roles'

interface GuildMember {
  user: {
    id: string
    username: string
    avatar?: string
    global_name?: string
  }
  nick?: string
  roles: string[]
}

// Listar atendentes disponíveis para sinalização baseado na categoria
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

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Bot não configurado' }, { status: 500 })
    }

    // Buscar membros do servidor com os cargos de staff
    const staffRoleIds = Object.keys(DISCORD_ROLE_MAP)
    
    // Buscar todos os membros do servidor (limitado a 1000)
    const membersResponse = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=1000`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    )

    if (!membersResponse.ok) {
      const errorText = await membersResponse.text()
      console.error('Erro ao buscar membros:', errorText)
      return NextResponse.json({ error: 'Erro ao buscar membros', details: errorText }, { status: 500 })
    }

    const members: GuildMember[] = await membersResponse.json()
    console.log(`Encontrados ${members.length} membros no servidor`)

    // Filtrar membros que:
    // 1. Têm algum cargo de staff
    // 2. O cargo tem permissão para acessar a categoria
    // 3. Não é o próprio usuário logado
    const availableStaff = members
      .filter((member) => {
        // Verificar se tem algum cargo de staff
        const hasStaffRole = member.roles.some((roleId) => staffRoleIds.includes(roleId))
        if (!hasStaffRole) return false

        // Não pode sinalizar para si mesmo
        if (member.user.id === session.discordId) return false

        // Obter o cargo mais alto do membro
        let highestRole: string | null = null
        let highestPriority = -1

        for (const roleId of member.roles) {
          const systemRole = DISCORD_ROLE_MAP[roleId]
          if (systemRole) {
            const priority = getRolePriority(systemRole)
            if (priority > highestPriority) {
              highestPriority = priority
              highestRole = systemRole
            }
          }
        }

        if (!highestRole) return false

        // Verificar se o cargo tem acesso à categoria
        const permissions = ROLE_PERMISSIONS[highestRole]
        return permissions?.includes(category)
      })
      .map((member) => {
        // Obter o cargo mais alto
        let highestRole: string | null = null
        let highestPriority = -1

        for (const roleId of member.roles) {
          const systemRole = DISCORD_ROLE_MAP[roleId]
          if (systemRole) {
            const priority = getRolePriority(systemRole)
            if (priority > highestPriority) {
              highestPriority = priority
              highestRole = systemRole
            }
          }
        }

        const avatarUrl = member.user.avatar
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
          : null

        return {
          discordId: member.user.id,
          name: member.nick || member.user.global_name || member.user.username,
          username: member.user.username,
          role: highestRole,
          avatar: avatarUrl,
        }
      })
      .sort((a, b) => {
        // Ordenar por prioridade do cargo (maior primeiro)
        const priorityA = getRolePriority(a.role || '')
        const priorityB = getRolePriority(b.role || '')
        if (priorityB !== priorityA) return priorityB - priorityA
        // Se mesma prioridade, ordenar por nome
        return a.name.localeCompare(b.name)
      })

    console.log(`Atendentes disponíveis para categoria ${category}:`, availableStaff.length)
    console.log('Atendentes:', availableStaff.map(s => `${s.name} (${s.role})`))
    
    return NextResponse.json({ staff: availableStaff })
  } catch (error) {
    console.error('Erro ao listar atendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function getRolePriority(role: string): number {
  const priorities: Record<string, number> = {
    CEO: 100,
    DEV: 100,
    COMMUNITY_MANAGER: 80,
    COORDENADOR: 60,
    MODERADOR: 40,
    SUPORTE: 20,
  }
  return priorities[role] || 0
}
