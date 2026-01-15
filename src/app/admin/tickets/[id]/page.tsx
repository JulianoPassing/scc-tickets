'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCategoryInfo } from '@/lib/categories'

interface Staff {
  staffId: string
  username: string
  name: string
  role: string
}

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
    id: string
    username: string
    displayName: string
    avatar: string
    discordId: string
  }
  assignedTo?: {
    id: string
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

export default function AdminTicketPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [staff, setStaff] = useState<Staff | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notifyUser, setNotifyUser] = useState(true)
  
  // Modais
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [newSubject, setNewSubject] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (staff && ticketId) {
      fetchTicket()
      const interval = setInterval(fetchTicket, 10000)
      return () => clearInterval(interval)
    }
  }, [staff, ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [ticket?.messages])

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
    }
  }

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`)
      if (!res.ok) {
        if (res.status === 404 || res.status === 403) {
          router.push('/admin/dashboard')
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
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, notifyUser }),
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

  const handleCloseTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FECHADO', closedReason: closeReason }),
      })

      if (res.ok) {
        setShowCloseModal(false)
        fetchTicket()
      }
    } catch (error) {
      console.error('Erro ao fechar ticket:', error)
    }
  }

  const handleRenameTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject }),
      })

      if (res.ok) {
        setShowRenameModal(false)
        fetchTicket()
      }
    } catch (error) {
      console.error('Erro ao renomear ticket:', error)
    }
  }

  const handleNotifyUser = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/notify`, {
        method: 'POST',
      })

      if (res.ok) {
        alert('Notificação enviada com sucesso!')
        fetchTicket()
      } else {
        alert('Erro ao enviar notificação')
      }
    } catch (error) {
      console.error('Erro ao notificar usuário:', error)
    }
  }

  const handleAssignToMe = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedToId: staff?.staffId,
          status: 'EM_ATENDIMENTO'
        }),
      })

      if (res.ok) {
        fetchTicket()
      }
    } catch (error) {
      console.error('Erro ao assumir ticket:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (!staff || !ticket) return null

  const categoryInfo = getCategoryInfo(ticket.category as any)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                &larr; Voltar
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryInfo?.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">#{ticket.ticketNumber}</span>
                    <span className={`badge ${STATUS_LABELS[ticket.status]?.class}`}>
                      {STATUS_LABELS[ticket.status]?.label}
                    </span>
                  </div>
                  <h1 className="font-bold">{ticket.subject}</h1>
                </div>
              </div>
            </div>

            {/* Ações */}
            {ticket.status !== 'FECHADO' && (
              <div className="flex items-center gap-2">
                {!ticket.assignedTo && (
                  <button onClick={handleAssignToMe} className="btn-secondary text-sm py-2">
                    🫡 Assumir
                  </button>
                )}
                <button
                  onClick={() => {
                    setNewSubject(ticket.subject)
                    setShowRenameModal(true)
                  }}
                  className="btn-secondary text-sm py-2"
                >
                  ✏️ Renomear
                </button>
                <button onClick={handleNotifyUser} className="btn-secondary text-sm py-2">
                  🔔 Avisar
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="btn-danger text-sm py-2"
                >
                  🔒 Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Chat */}
        <div className="flex-1">
          <div className="card min-h-[600px] flex flex-col">
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

            {/* Input */}
            {ticket.status !== 'FECHADO' ? (
              <form onSubmit={handleSendMessage} className="border-t border-border pt-4">
                <div className="flex gap-3 mb-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="textarea flex-1"
                    rows={3}
                    placeholder="Digite sua resposta..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyUser}
                      onChange={(e) => setNotifyUser(e.target.checked)}
                      className="rounded border-border"
                    />
                    Notificar usuário via Discord
                  </label>
                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="btn-primary px-8 disabled:opacity-50"
                  >
                    {sending ? 'Enviando...' : 'Enviar Resposta'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-border pt-4 text-center text-gray-400">
                Este ticket foi fechado em{' '}
                {ticket.closedAt && new Date(ticket.closedAt).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="w-80 space-y-6">
          <div className="card">
            <h3 className="font-bold mb-4">Informações do Usuário</h3>
            <div className="flex items-center gap-3 mb-4">
              {ticket.user.avatar && (
                <Image
                  src={ticket.user.avatar}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">{ticket.user.displayName || ticket.user.username}</p>
                <p className="text-sm text-gray-400">@{ticket.user.username}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Discord ID:</span>{' '}
                <code className="bg-background px-2 py-1 rounded">{ticket.user.discordId}</code>
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold mb-4">Detalhes do Ticket</h3>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-gray-400">Categoria:</span>{' '}
                {categoryInfo?.emoji} {categoryInfo?.name}
              </p>
              <p>
                <span className="text-gray-400">Status:</span>{' '}
                <span className={`badge ${STATUS_LABELS[ticket.status]?.class}`}>
                  {STATUS_LABELS[ticket.status]?.label}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Criado em:</span>{' '}
                {new Date(ticket.createdAt).toLocaleString('pt-BR')}
              </p>
              <p>
                <span className="text-gray-400">Atualizado em:</span>{' '}
                {new Date(ticket.updatedAt).toLocaleString('pt-BR')}
              </p>
              {ticket.assignedTo && (
                <p>
                  <span className="text-gray-400">Atendente:</span>{' '}
                  {ticket.assignedTo.name}
                </p>
              )}
              {ticket.closedReason && (
                <p>
                  <span className="text-gray-400">Motivo fechamento:</span>{' '}
                  {ticket.closedReason}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal Fechar */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Fechar Ticket</h2>
            <p className="text-gray-400 mb-4">
              Informe o motivo do fechamento. O usuário será notificado.
            </p>
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="textarea mb-4"
              rows={3}
              placeholder="Motivo do fechamento..."
              required
            />
            <div className="flex gap-3">
              <button onClick={handleCloseTicket} className="btn-danger flex-1">
                Fechar Ticket
              </button>
              <button onClick={() => setShowCloseModal(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Renomear */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Renomear Ticket</h2>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="input mb-4"
              placeholder="Novo assunto..."
              required
            />
            <div className="flex gap-3">
              <button onClick={handleRenameTicket} className="btn-primary flex-1">
                Renomear
              </button>
              <button onClick={() => setShowRenameModal(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
