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

    // Determinar quais cargos têm acesso à categoria
    const rolesWithAccess = Object.entries(DISCORD_ROLE_MAP)
      .filter(([_, systemRole]) => {
        const permissions = ROLE_PERMISSIONS[systemRole]
        return permissions?.includes(category)
      })
      .map(([discordRoleId]) => discordRoleId)

    console.log(`Cargos com acesso à categoria ${category}:`, rolesWithAccess)

    if (rolesWithAccess.length === 0) {
      return NextResponse.json({ staff: [] })
    }

    // Buscar membros de cada cargo que tem acesso
    const membersMap = new Map<string, GuildMember>()

    for (const roleId of rolesWithAccess) {
      try {
        // Buscar membros com este cargo específico
        // Usando search com role_id (não funciona diretamente, então vamos usar outra abordagem)
        // A API de members não filtra por role, então precisamos usar uma abordagem diferente
        
        // Vamos buscar usando a API de search que permite buscar por query vazia
        // mas isso também tem limitações...
        
        // Melhor abordagem: usar a API de guild roles para pegar os membros
        // Mas essa API não existe diretamente...
        
        // Solução: paginar através de todos os membros usando 'after'
        let after = '0'
        let hasMore = true
        let iterations = 0
        const maxIterations = 30 // máximo 30.000 membros

        while (hasMore && iterations < maxIterations) {
          const membersResponse = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`,
            {
              headers: {
                Authorization: `Bot ${botToken}`,
              },
            }
          )

          if (!membersResponse.ok) {
            console.error('Erro ao buscar membros:', await membersResponse.text())
            break
          }

          const members: GuildMember[] = await membersResponse.json()
          
          if (members.length === 0) {
            hasMore = false
            break
          }

          // Filtrar membros que têm cargos de staff
          for (const member of members) {
            if (member.roles.some(r => rolesWithAccess.includes(r))) {
              membersMap.set(member.user.id, member)
            }
          }

          // Próxima página
          after = members[members.length - 1].user.id
          iterations++
          
          // Se encontramos menos de 1000, não há mais páginas
          if (members.length < 1000) {
            hasMore = false
          }
        }

        console.log(`Após ${iterations} iterações, encontrados ${membersMap.size} membros com cargos de staff`)
        
        // Já encontramos todos os membros necessários, não precisa continuar o loop de roles
        break
        
      } catch (error) {
        console.error(`Erro ao buscar membros do cargo ${roleId}:`, error)
      }
    }

    // Converter para array e filtrar
    const staffRoleIds = Object.keys(DISCORD_ROLE_MAP)
    
    const availableStaff = Array.from(membersMap.values())
      .filter((member) => {
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
