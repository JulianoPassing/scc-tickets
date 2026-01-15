import { TicketCategory } from '@prisma/client'

export interface CategoryInfo {
  id: TicketCategory
  name: string
  emoji: string
  description: string
  color: string
  colorClass: string
  bgClass: string
  borderClass: string
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'SUPORTE',
    name: 'Suporte',
    emoji: '📁',
    description: 'Suporte técnico e ajuda geral',
    color: '#6366F1',
    colorClass: 'text-cat-suporte',
    bgClass: 'bg-cat-suporte/20',
    borderClass: 'border-cat-suporte',
  },
  {
    id: 'BUGS',
    name: 'Reportar Bugs',
    emoji: '🦠',
    description: 'Reportar erros e problemas técnicos',
    color: '#22C55E',
    colorClass: 'text-cat-bugs',
    bgClass: 'bg-cat-bugs/20',
    borderClass: 'border-cat-bugs',
  },
  {
    id: 'DENUNCIAS',
    name: 'Denúncias',
    emoji: '⚠️',
    description: 'Reportar infrações e problemas de conduta',
    color: '#EF4444',
    colorClass: 'text-cat-denuncias',
    bgClass: 'bg-cat-denuncias/20',
    borderClass: 'border-cat-denuncias',
  },
  {
    id: 'DOACOES',
    name: 'Doações',
    emoji: '💎',
    description: 'Assuntos relacionados a doações',
    color: '#A855F7',
    colorClass: 'text-cat-doacoes',
    bgClass: 'bg-cat-doacoes/20',
    borderClass: 'border-cat-doacoes',
  },
  {
    id: 'BOOST',
    name: 'Boost',
    emoji: '🚀',
    description: 'Suporte para membros boosters',
    color: '#EC4899',
    colorClass: 'text-cat-boost',
    bgClass: 'bg-cat-boost/20',
    borderClass: 'border-cat-boost',
  },
  {
    id: 'CASAS',
    name: 'Casas',
    emoji: '🏠',
    description: 'Questões relacionadas a casas e propriedades',
    color: '#F59E0B',
    colorClass: 'text-cat-casas',
    bgClass: 'bg-cat-casas/20',
    borderClass: 'border-cat-casas',
  },
  {
    id: 'REVISAO',
    name: 'Revisão',
    emoji: '🔍',
    description: 'Solicitar revisão de decisões e processos',
    color: '#06B6D4',
    colorClass: 'text-cat-revisao',
    bgClass: 'bg-cat-revisao/20',
    borderClass: 'border-cat-revisao',
  },
]

export function getCategoryInfo(category: TicketCategory): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.id === category)
}

export function getCategoryEmoji(category: TicketCategory): string {
  return getCategoryInfo(category)?.emoji || '📋'
}

export function getCategoryColor(category: TicketCategory): string {
  return getCategoryInfo(category)?.color || '#EAF207'
}

export function getCategoryClasses(category: TicketCategory): { colorClass: string; bgClass: string; borderClass: string } {
  const info = getCategoryInfo(category)
  return {
    colorClass: info?.colorClass || 'text-primary',
    bgClass: info?.bgClass || 'bg-primary/20',
    borderClass: info?.borderClass || 'border-primary',
  }
}
