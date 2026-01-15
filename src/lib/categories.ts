import { TicketCategory } from '@prisma/client'

export interface CategoryInfo {
  id: TicketCategory
  name: string
  emoji: string
  description: string
  color: string
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'SUPORTE',
    name: 'Suporte',
    emoji: '📁',
    description: 'Suporte técnico e ajuda geral',
    color: '#6366f1',
  },
  {
    id: 'BUGS',
    name: 'Reportar Bugs',
    emoji: '🦠',
    description: 'Reportar erros e problemas técnicos',
    color: '#22c55e',
  },
  {
    id: 'DENUNCIAS',
    name: 'Denúncias',
    emoji: '⚠️',
    description: 'Reportar infrações e problemas de conduta',
    color: '#ef4444',
  },
  {
    id: 'DOACOES',
    name: 'Doações',
    emoji: '💎',
    description: 'Assuntos relacionados a doações',
    color: '#8b5cf6',
  },
  {
    id: 'BOOST',
    name: 'Boost',
    emoji: '🚀',
    description: 'Suporte para membros boosters',
    color: '#f472b6',
  },
  {
    id: 'CASAS',
    name: 'Casas',
    emoji: '🏠',
    description: 'Questões relacionadas a casas e propriedades',
    color: '#f59e0b',
  },
  {
    id: 'REVISAO',
    name: 'Revisão',
    emoji: '🔍',
    description: 'Solicitar revisão de decisões e processos',
    color: '#06b6d4',
  },
]

export function getCategoryInfo(category: TicketCategory): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.id === category)
}

export function getCategoryEmoji(category: TicketCategory): string {
  return getCategoryInfo(category)?.emoji || '📋'
}
