'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCategoryEmoji, CATEGORIES } from '@/lib/categories'
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/permissions'

interface Staff {
  staffId: string
  username: string
  name: string
  role: string
  avatar?: string
}

interface Ticket {
  id: string
  ticketNumber: number
  category: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  closedReason?: string
  user: {
    username: string
    displayName: string
    avatar: string
    discordId: string
  }
  assignedTo?: {
    name: string
    role: string
    avatar?: string
  }
  lastAttendant?: {
    id: string
    name: string
    role: string
    avatar?: string
  } | null
  messages: { content: string }[]
  // Campos para tickets sinalizados
  flaggedBy?: {
    id: string
    name: string
    role: string
    avatar?: string
  }
  flaggedToRole?: string
  flagMessage?: string
  flaggedAt?: string
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ABERTO: { label: 'Aberto', class: 'badge-info' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', class: 'badge-warning' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', class: 'badge-primary' },
  FECHADO: { label: 'Fechado', class: 'badge-danger' },
}


export default function AdminDashboardPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [flaggedTickets, setFlaggedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ativos' | 'resolvidos' | 'sinalizados'>('ativos')
  const [filter, setFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (staff) {
      fetchTickets()
      fetchFlaggedTickets()
    }
  }, [staff, filter, categoryFilter, activeTab, searchQuery])

  // Auto-refresh para detectar novos tickets
  useEffect(() => {
    if (!staff) return

    // Limpar intervalo anterior se existir
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    // Intervalo de 10 segundos para verificar novos tickets
    refreshIntervalRef.current = setInterval(() => {
      fetchTickets()
      if (activeTab === 'sinalizados') {
        fetchFlaggedTickets()
      }
    }, 10000) // 10 segundos

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [staff, filter, categoryFilter, activeTab])

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
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    }
  }

  const fetchFlaggedTickets = async () => {
    try {
      const res = await fetch('/api/admin/tickets/flagged')
      const data = await res.json()
      setFlaggedTickets(data.tickets || [])
    } catch (error) {
      console.error('Erro ao carregar tickets sinalizados:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  const handleExportAll = async (statusFilter: 'all' | 'abertos' | 'fechados' = 'all') => {
    try {
      setShowExportModal(false)
      const res = await fetch(`/api/admin/tickets/export-all?status=${statusFilter}`)
      if (!res.ok) {
        alert('Erro ao exportar tickets')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Nome do arquivo baseado no filtro
      const statusLabel = statusFilter === 'abertos' ? 'abertos' : statusFilter === 'fechados' ? 'fechados' : 'todos'
      a.download = `tickets-${statusLabel}-${new Date().toISOString().split('T')[0]}.zip`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar tickets:', error)
      alert('Erro ao exportar tickets')
    }
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

  // Separar tickets ativos e resolvidos
  const ticketsAtivos = tickets.filter((t) => t.status !== 'FECHADO')
  const ticketsResolvidos = tickets.filter((t) => t.status === 'FECHADO')
  const currentTickets = activeTab === 'ativos' 
    ? ticketsAtivos 
    : activeTab === 'resolvidos' 
    ? ticketsResolvidos 
    : flaggedTickets

  // Aplicar filtros adicionais
  const filteredTickets = currentTickets.filter((t) => {
    if (activeTab === 'ativos' && filter !== 'all' && t.status !== filter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    return true
  })

  // Estatísticas
  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => t.status === 'ABERTO').length,
    emAtendimento: tickets.filter((t) => t.status === 'EM_ATENDIMENTO').length,
    aguardando: tickets.filter((t) => t.status === 'AGUARDANDO_RESPOSTA').length,
    resolvidos: ticketsResolvidos.length,
    sinalizados: flaggedTickets.length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay active"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Botão hambúrguer para mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="mobile-menu-button lg:hidden"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 flex flex-col ${sidebarOpen ? 'mobile-active' : ''}`}>
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
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            📊 Dashboard
          </Link>
          <button
            onClick={() => {
              setActiveTab('ativos')
              setFilter('all')
              setSidebarOpen(false)
              document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-card text-gray-300 hover:text-white transition-colors text-left"
          >
            🎫 Tickets Ativos
          </button>
          <button
            onClick={() => {
              setActiveTab('resolvidos')
              setFilter('all')
              setSidebarOpen(false)
              document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-card text-gray-300 hover:text-white transition-colors text-left"
          >
            ✅ Resolvidos
          </button>
          <button
            onClick={() => {
              setActiveTab('sinalizados')
              setFilter('all')
              setSidebarOpen(false)
              document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-card text-gray-300 hover:text-white transition-colors text-left relative"
          >
            🚩 Sinalizados
            {flaggedTickets.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {flaggedTickets.length}
              </span>
            )}
          </button>
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            {staff.avatar ? (
              <Image
                src={staff.avatar}
                alt={staff.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {staff.name[0]}
              </div>
            )}
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-400">Bem-vindo, {staff.name}!</p>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary flex items-center gap-2"
            title="Exportar tickets em ZIP"
          >
            📦 Exportar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
          <div className="card border-green-500/30">
            <p className="text-gray-400 text-sm mb-1">Resolvidos</p>
            <p className="text-3xl font-bold text-green-400">{stats.resolvidos}</p>
          </div>
        </div>

        {/* Abas e Filtros */}
        <div id="tickets" className="mb-6">
          {/* Abas principais */}
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              onClick={() => {
                setActiveTab('ativos')
                setFilter('all')
              }}
              className={`pb-3 px-2 font-semibold transition-colors relative ${
                activeTab === 'ativos'
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎫 Tickets Ativos
              <span className="ml-2 bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">
                {ticketsAtivos.length}
              </span>
              {activeTab === 'ativos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('resolvidos')
                setFilter('all')
              }}
              className={`pb-3 px-2 font-semibold transition-colors relative ${
                activeTab === 'resolvidos'
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ✅ Tickets Resolvidos
              <span className="ml-2 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                {ticketsResolvidos.length}
              </span>
              {activeTab === 'resolvidos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('sinalizados')
                setFilter('all')
              }}
              className={`pb-3 px-2 font-semibold transition-colors relative ${
                activeTab === 'sinalizados'
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚩 Tickets Sinalizados
              <span className={`ml-2 ${flaggedTickets.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'} text-xs px-2 py-0.5 rounded-full`}>
                {flaggedTickets.length}
              </span>
              {activeTab === 'sinalizados' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Filtro de Status (apenas para tickets ativos) */}
            {activeTab === 'ativos' && (
              <div className="flex flex-wrap gap-2">
                {['all', 'ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_RESPOSTA'].map((status) => (
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
            )}

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

            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[250px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, nome do usuário ou Discord ID..."
                className="input w-full pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Tickets */}
        {filteredTickets.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">
              {activeTab === 'ativos' ? '📭' : activeTab === 'resolvidos' ? '📋' : '🚩'}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {activeTab === 'ativos' 
                ? 'Nenhum ticket ativo' 
                : activeTab === 'resolvidos'
                ? 'Nenhum ticket resolvido'
                : 'Nenhum ticket sinalizado'}
            </h3>
            <p className="text-gray-400">
              {activeTab === 'ativos' 
                ? 'Não há tickets ativos correspondentes aos filtros selecionados.'
                : activeTab === 'resolvidos'
                ? 'Não há tickets resolvidos nas categorias que você tem acesso.'
                : 'Não há tickets sinalizados para você no momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                className={`card block hover:border-primary transition-all duration-200 ${
                  activeTab === 'sinalizados' ? 'border-red-500/30' : ''
                }`}
              >
                {/* Banner de sinalização */}
                {activeTab === 'sinalizados' && ticket.flaggedBy && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border text-sm">
                    <span className="text-red-400">🚩</span>
                    <span className="text-gray-400">
                      Sinalizado por <span className="text-white font-medium">{ticket.flaggedBy.name}</span>
                      {ticket.flaggedAt && (
                        <> em {new Date(ticket.flaggedAt).toLocaleString('pt-BR')}</>
                      )}
                    </span>
                    {ticket.flagMessage && (
                      <span className="text-yellow-400 ml-2">
                        &ldquo;{ticket.flagMessage}&rdquo;
                      </span>
                    )}
                  </div>
                )}
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
                      {ticket.status === 'FECHADO' && ticket.closedAt ? (
                        <p className="text-green-400">
                          Fechado em {new Date(ticket.closedAt).toLocaleString('pt-BR')}
                        </p>
                      ) : (
                        <p>{new Date(ticket.updatedAt).toLocaleString('pt-BR')}</p>
                      )}
                      {(ticket.lastAttendant || ticket.assignedTo) && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          {ticket.lastAttendant ? (
                            <>
                              {ticket.lastAttendant.avatar ? (
                                <Image
                                  src={ticket.lastAttendant.avatar}
                                  alt={ticket.lastAttendant.name}
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white">
                                  {ticket.lastAttendant.name[0]}
                                </div>
                              )}
                              <span className="text-primary text-xs">{ticket.lastAttendant.name}</span>
                            </>
                          ) : ticket.assignedTo ? (
                            <>
                          {ticket.assignedTo.avatar ? (
                            <Image
                              src={ticket.assignedTo.avatar}
                              alt={ticket.assignedTo.name}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white">
                              {ticket.assignedTo.name[0]}
                            </div>
                          )}
                          <span className="text-primary text-xs">{ticket.assignedTo.name}</span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Exportação */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">📦 Exportar Tickets</h2>
            <p className="text-gray-400 mb-6">
              Escolha quais tickets deseja exportar. Todos serão salvos em um arquivo ZIP.
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleExportAll('all')}
                className="w-full btn-primary text-left flex items-center justify-between"
              >
                <span>📋 Todos os Tickets</span>
                <span className="text-xs opacity-75">Todos os status</span>
              </button>
              
              <button
                onClick={() => handleExportAll('abertos')}
                className="w-full btn-secondary text-left flex items-center justify-between"
              >
                <span>🟢 Apenas Abertos</span>
                <span className="text-xs opacity-75">Abertos, Em Atendimento, Aguardando</span>
              </button>
              
              <button
                onClick={() => handleExportAll('fechados')}
                className="w-full btn-secondary text-left flex items-center justify-between"
              >
                <span>🔴 Apenas Fechados</span>
                <span className="text-xs opacity-75">Apenas tickets resolvidos</span>
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
