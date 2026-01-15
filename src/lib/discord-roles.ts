// Configuração de cargos do Discord para autenticação admin

// ID do servidor Discord
export const DISCORD_GUILD_ID = '1046404063287332936'

// Mapeamento de cargo Discord -> Role do sistema
export const DISCORD_ROLE_MAP: Record<string, string> = {
  '1046404063689977986': 'CEO',           // CEO
  '1046404063689977984': 'CEO',           // Dev (mesmos acessos do CEO)
  '1046404063522197521': 'COMMUNITY_MANAGER', // Community Manager
  '1226907937117569128': 'MODERADOR',     // Moderador
  '1226903187055972484': 'COORDENADOR',   // Coordenador
  '1046404063673192542': 'SUPORTE',       // Suporte
}

// IDs de cargos que podem acessar o painel admin (todos os acima)
export const ALLOWED_ROLE_IDS = Object.keys(DISCORD_ROLE_MAP)

// Prioridade dos cargos (maior = mais importante)
// Se o usuário tiver múltiplos cargos, usa o de maior prioridade
export const ROLE_PRIORITY: Record<string, number> = {
  'CEO': 100,
  'COMMUNITY_MANAGER': 80,
  'COORDENADOR': 60,
  'MODERADOR': 40,
  'SUPORTE': 20,
}

// Função para obter o cargo mais alto de um usuário baseado nos IDs de cargo do Discord
export function getHighestRole(discordRoleIds: string[]): string | null {
  let highestRole: string | null = null
  let highestPriority = -1

  for (const roleId of discordRoleIds) {
    const systemRole = DISCORD_ROLE_MAP[roleId]
    if (systemRole) {
      const priority = ROLE_PRIORITY[systemRole] || 0
      if (priority > highestPriority) {
        highestPriority = priority
        highestRole = systemRole
      }
    }
  }

  return highestRole
}

// Função para verificar se o usuário tem algum cargo permitido
export function hasAllowedRole(discordRoleIds: string[]): boolean {
  return discordRoleIds.some(roleId => ALLOWED_ROLE_IDS.includes(roleId))
}
