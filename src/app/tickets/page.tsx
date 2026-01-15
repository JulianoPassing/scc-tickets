'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { getCategoryEmoji, getCategoryInfo } from '@/lib/categories'

interface Ticket {
  id: string
  ticketNumber: number
  category: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  assignedTo?: { name: string }
  messages: { content: string }[]
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ABERTO: { label: 'Aberto', class: 'badge-info' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', class: 'badge-warning' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', class: 'badge-primary' },
  FECHADO: { label: 'Fechado', class: 'badge-danger' },
}

export default function TicketsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/tickets')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchTickets()
    }
  }, [session, filter])

  const fetchTickets = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/tickets${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Meus Tickets</h1>
              <p className="text-gray-400 mt-1">
                Acompanhe e gerencie seus tickets de suporte
              </p>
            </div>
            <Link href="/#categorias" className="btn-primary">
              + Novo Ticket
            </Link>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_RESPOSTA', 'FECHADO'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-background'
                    : 'bg-card border border-border hover:border-primary'
                }`}
              >
                {status === 'all' ? 'Todos' : STATUS_LABELS[status]?.label}
              </button>
            ))}
          </div>

          {/* Lista de Tickets */}
          {tickets.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">Nenhum ticket encontrado</h3>
              <p className="text-gray-400 mb-6">
                Você ainda não possui tickets ou nenhum ticket corresponde ao filtro selecionado.
              </p>
              <Link href="/#categorias" className="btn-primary">
                Abrir um Ticket
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="card block hover:border-primary transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">
                        {getCategoryEmoji(ticket.category as any)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-400">
                            #{ticket.ticketNumber}
                          </span>
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
                    <div className="text-right text-sm text-gray-400">
                      <p>
                        Criado em {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {ticket.assignedTo && (
                        <p className="text-primary">
                          Atendido por {ticket.assignedTo.name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
