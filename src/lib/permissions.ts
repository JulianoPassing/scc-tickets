// Permissões por cargo - pode ser importado em client e server components

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPORTE: ['SUPORTE', 'BUGS', 'BOOST'],
  AJUDANTE: ['SUPORTE', 'BUGS'],
  MODERADOR: ['SUPORTE', 'BUGS', 'BOOST'],
  COORDENADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  COMMUNITY_MANAGER: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  CEO: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  DEV: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'], // Mesmos acessos do CEO
}

// Função síncrona básica (sem verificação de Corretor)
export function canAccessCategory(role: string, category: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  
  // Para CASAS, apenas CM, DEV e CEO têm acesso direto
  // Outros cargos precisam ter o cargo "Corretor" (verificado separadamente)
  if (category === 'CASAS') {
    return role === 'COMMUNITY_MANAGER' || role === 'DEV' || role === 'CEO'
  }
  
  return permissions.includes(category)
}

// Função assíncrona que verifica também o cargo "Corretor" para CASAS
export async function canAccessCategoryWithCorretor(
  role: string, 
  category: string, 
  discordId?: string,
  hasCorretorRole?: boolean
): Promise<boolean> {
  // Se não for CASAS, usar a função básica
  if (category !== 'CASAS') {
    return canAccessCategory(role, category)
  }

  // Para CASAS: CM, DEV e CEO sempre têm acesso
  if (role === 'COMMUNITY_MANAGER' || role === 'DEV' || role === 'CEO') {
    return true
  }

  // Para outros cargos, verificar se têm o cargo "Corretor"
  if (hasCorretorRole !== undefined) {
    return hasCorretorRole
  }

  // Se não foi passado, tentar verificar via Discord API
  if (discordId) {
    const { hasCorretorRole: checkCorretor } = await import('./discord-roles')
    return await checkCorretor(discordId)
  }

  return false
}

export const ROLE_LABELS: Record<string, string> = {
  SUPORTE: 'Suporte',
  AJUDANTE: 'Ajudante',
  MODERADOR: 'Moderador',
  COORDENADOR: 'Coordenador',
  COMMUNITY_MANAGER: 'Community Manager',
  CEO: 'CEO',
  DEV: 'Desenvolvedor',
}
