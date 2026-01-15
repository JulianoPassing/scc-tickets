'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCategoryEmoji, CATEGORIES } from '@/lib/categories'
import { ROLE_PERMISSIONS } from '@/lib/admin-auth'

interface Staff {
  staffId: string
  username: string
  name: string
  role: string
}

interface Ticket {
  id: string
  ticketNumber: number
  category: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  user: {
    username: string
    displayName: string
    avatar: string
    discordId: string
  }
  assignedTo?: {
    name: string
    role: string
  }
  messages: { content: string }[]
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ABERTO: { label: 'Aberto', class: 'badge-info' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', class: 'badge-warning' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', class: 'badge-primary' },
  FECHADO: { label: 'Fechado', class: 'badge-danger' },
}

const ROLE_LABELS: Record<string, string> = {
  SUPORTE: 'Suporte',
  MODERADOR: 'Moderador',
  COORDENADOR: 'Coordenador',
  COMMUNITY_MANAGER: 'Community Manager',
  CEO: 'CEO',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (staff) {
      fetchTickets()
    }
  }, [staff, filter, categoryFilter])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me')
      if (!res.ok) {
        router.push('/admin')
        return
      }
      const data = await res.json()
      setStaff(data.staff)
    } catch (error) {
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const fetchTickets = async () => {
    try {
      let url = '/api/admin/tickets'
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (!staff) return null

  const allowedCategories = ROLE_PERMISSIONS[staff.role] || []

  // Estatísticas
  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => t.status === 'ABERTO').length,
    emAtendimento: tickets.filter((t) => t.status === 'EM_ATENDIMENTO').length,
    aguardando: tickets.filter((t) => t.status === 'AGUARDANDO_RESPOSTA').length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="mb-8">
          <Image
            src="https://i.imgur.com/kHvmXj6.png"
            alt="SCC"
            width={180}
            height={60}
            className="mx-auto"
          />
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            📊 Dashboard
          </Link>
          <a
            href="#tickets"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-card text-gray-300 hover:text-white transition-colors"
          >
            🎫 Tickets
          </a>
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {staff.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{staff.name}</p>
              <p className="text-xs text-primary">{ROLE_LABELS[staff.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Bem-vindo, {staff.name}!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total de Tickets</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="card border-blue-500/30">
            <p className="text-gray-400 text-sm mb-1">Abertos</p>
            <p className="text-3xl font-bold text-blue-400">{stats.abertos}</p>
          </div>
          <div className="card border-yellow-500/30">
            <p className="text-gray-400 text-sm mb-1">Em Atendimento</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.emAtendimento}</p>
          </div>
          <div className="card border-primary/30">
            <p className="text-gray-400 text-sm mb-1">Aguardando Resposta</p>
            <p className="text-3xl font-bold text-primary">{stats.aguardando}</p>
          </div>
        </div>

        {/* Filtros */}
        <div id="tickets" className="mb-6">
          <h2 className="text-xl font-bold mb-4">Tickets</h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Filtro de Status */}
            <div className="flex flex-wrap gap-2">
              {['all', 'ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_RESPOSTA', 'FECHADO'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-primary text-background'
                      : 'bg-card border border-border hover:border-primary'
                  }`}
                >
                  {status === 'all' ? 'Todos' : STATUS_LABELS[status]?.label}
                </button>
              ))}
            </div>

            {/* Filtro de Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Todas Categorias</option>
              {CATEGORIES.filter((c) => allowedCategories.includes(c.id)).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Tickets */}
        {tickets.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum ticket encontrado</h3>
            <p className="text-gray-400">
              Não há tickets correspondentes aos filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                className="card block hover:border-primary transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{getCategoryEmoji(ticket.category as any)}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-400">#{ticket.ticketNumber}</span>
                        <span className={`badge ${STATUS_LABELS[ticket.status]?.class}`}>
                          {STATUS_LABELS[ticket.status]?.label}
                        </span>
                      </div>
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {ticket.messages[0]?.content || 'Sem mensagens'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      {ticket.user.avatar && (
                        <Image
                          src={ticket.user.avatar}
                          alt="Avatar"
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <div className="text-sm">
                        <p className="font-medium">{ticket.user.displayName || ticket.user.username}</p>
                        <p className="text-gray-500 text-xs">{ticket.user.discordId}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <p>{new Date(ticket.updatedAt).toLocaleString('pt-BR')}</p>
                      {ticket.assignedTo && (
                        <p className="text-primary text-xs">{ticket.assignedTo.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
