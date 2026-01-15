'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { getCategoryInfo } from '@/lib/categories'

interface Message {
  id: string
  content: string
  createdAt: string
  isSystemMessage: boolean
  user?: {
    username: string
    displayName: string
    avatar: string
  }
  staff?: {
    name: string
    role: string
  }
  attachments: {
    id: string
    filename: string
    url: string
    mimeType: string
  }[]
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
  }
  assignedTo?: {
    name: string
    role: string
  }
  messages: Message[]
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ABERTO: { label: 'Aberto', class: 'badge-info' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', class: 'badge-warning' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', class: 'badge-primary' },
  FECHADO: { label: 'Fechado', class: 'badge-danger' },
}

export default function TicketChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/tickets/${ticketId}`)
    }
  }, [status, router, ticketId])

  useEffect(() => {
    if (session && ticketId) {
      fetchTicket()
      // Poll a cada 10 segundos
      const interval = setInterval(fetchTicket, 10000)
      return () => clearInterval(interval)
    }
  }, [session, ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [ticket?.messages])

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/tickets')
        }
        return
      }
      const data = await res.json()
      setTicket(data.ticket)
    } catch (error) {
      console.error('Erro ao carregar ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || ticket?.status === 'FECHADO') return

    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })

      if (res.ok) {
        setMessage('')
        fetchTicket()
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (!session || !ticket) return null

  const categoryInfo = getCategoryInfo(ticket.category as any)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
          {/* Header do Ticket */}
          <div className="mb-6">
            <Link href="/tickets" className="text-gray-400 hover:text-primary transition-colors text-sm">
              &larr; Voltar para Meus Tickets
            </Link>
          </div>

          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{categoryInfo?.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-400">Ticket #{ticket.ticketNumber}</span>
                    <span className={`badge ${STATUS_LABELS[ticket.status]?.class}`}>
                      {STATUS_LABELS[ticket.status]?.label}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold">{ticket.subject}</h1>
                </div>
              </div>
              <div className="text-sm text-gray-400 text-right">
                <p>Criado em {new Date(ticket.createdAt).toLocaleString('pt-BR')}</p>
                {ticket.assignedTo && (
                  <p className="text-primary">Atendente: {ticket.assignedTo.name}</p>
                )}
              </div>
            </div>
            {ticket.status === 'FECHADO' && ticket.closedReason && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">
                  <strong>Motivo do fechamento:</strong> {ticket.closedReason}
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="card flex-1 flex flex-col min-h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[500px]">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.isSystemMessage
                      ? 'message-system'
                      : msg.staff
                      ? 'message-staff'
                      : 'message-user'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!msg.isSystemMessage && (
                      <div className="flex-shrink-0">
                        {msg.user?.avatar ? (
                          <Image
                            src={msg.user.avatar}
                            alt="Avatar"
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {msg.staff?.name[0] || 'S'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {msg.isSystemMessage
                            ? 'Sistema'
                            : msg.staff
                            ? `${msg.staff.name} (${msg.staff.role})`
                            : msg.user?.displayName || msg.user?.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.attachments.map((att) => (
                            <div key={att.id}>
                              {att.mimeType.startsWith('image/') ? (
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <Image
                                    src={att.url}
                                    alt={att.filename}
                                    width={300}
                                    height={200}
                                    className="rounded-lg max-w-full"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-background rounded-lg text-sm hover:text-primary"
                                >
                                  📎 {att.filename}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            {ticket.status !== 'FECHADO' ? (
              <form onSubmit={handleSendMessage} className="border-t border-border pt-4">
                <div className="flex gap-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="textarea flex-1"
                    rows={2}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="btn-primary px-6 h-fit self-end disabled:opacity-50"
                  >
                    {sending ? '...' : 'Enviar'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pressione Enter para enviar ou Shift+Enter para nova linha
                </p>
              </form>
            ) : (
              <div className="border-t border-border pt-4 text-center text-gray-400">
                Este ticket foi fechado e não aceita novas mensagens.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
