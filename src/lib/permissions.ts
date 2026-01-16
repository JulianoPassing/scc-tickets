// Permissões por cargo - pode ser importado em client e server components

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPORTE: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  AJUDANTE: ['SUPORTE', 'BUGS'],
  MODERADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  COORDENADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  COMMUNITY_MANAGER: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  CEO: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  DEV: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'], // Mesmos acessos do CEO
}

export function canAccessCategory(role: string, category: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(category)
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
