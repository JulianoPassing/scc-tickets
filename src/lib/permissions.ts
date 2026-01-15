// Permissões por cargo - pode ser importado em client e server components

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPORTE: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  MODERADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  COORDENADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  COMMUNITY_MANAGER: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  CEO: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
}

export function canAccessCategory(role: string, category: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(category)
}

export const ROLE_LABELS: Record<string, string> = {
  SUPORTE: 'Suporte',
  MODERADOR: 'Moderador',
  COORDENADOR: 'Coordenador',
  COMMUNITY_MANAGER: 'Community Manager',
  CEO: 'CEO',
}
