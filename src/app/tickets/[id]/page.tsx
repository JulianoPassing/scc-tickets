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
    avatar?: string
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

interface PendingImage {
  file: File
  preview: string
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
  const [isFlagged, setIsFlagged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const shouldScrollToBottomRef = useRef(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/tickets/${ticketId}`)
    }
  }, [status, router, ticketId])

  useEffect(() => {
    if (session && ticketId) {
      fetchTicket()
      const interval = setInterval(fetchMessagesOnly, 10000)
      return () => clearInterval(interval)
    }
  }, [session, ticketId])

  // Só faz scroll automático se o usuário estiver perto do final ou acabou de enviar mensagem
  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom()
    }
  }, [ticket?.messages])

  // Detectar se o usuário está perto do final do scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      shouldScrollToBottomRef.current = isNearBottom
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Listener para colar imagens
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            addPendingImage(file)
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const addPendingImage = (file: File) => {
    const preview = URL.createObjectURL(file)
    setPendingImages(prev => [...prev, { file, preview }])
  }

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        addPendingImage(files[i])
      }
    }
    e.target.value = ''
  }

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
      setIsFlagged(data.isFlagged || false)
      // Guardar o ID da última mensagem
      if (data.ticket?.messages?.length > 0) {
        lastMessageIdRef.current = data.ticket.messages[data.ticket.messages.length - 1].id
      }
    } catch (error) {
      console.error('Erro ao carregar ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  // Busca apenas as mensagens sem afetar o scroll
  const fetchMessagesOnly = async () => {
    if (!ticket) return
    
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (!res.ok) return
      
      const data = await res.json()
      const newMessages = data.ticket?.messages || []
      
      // Verifica se há novas mensagens
      const lastNewMessageId = newMessages.length > 0 ? newMessages[newMessages.length - 1].id : null
      const hasNewMessages = lastNewMessageId !== lastMessageIdRef.current
      
      if (hasNewMessages) {
        // Guardar posição do scroll antes de atualizar
        const container = messagesContainerRef.current
        const scrollPosition = container?.scrollTop || 0
        const scrollHeight = container?.scrollHeight || 0
        const wasAtBottom = container ? (scrollHeight - scrollPosition - container.clientHeight < 100) : true
        
        // Atualizar o ticket (mensagens e status)
        setTicket(prev => prev ? { ...prev, messages: newMessages, status: data.ticket.status } : null)
        setIsFlagged(data.isFlagged || false)
        
        // Atualizar referência da última mensagem
        lastMessageIdRef.current = lastNewMessageId
        
        // Se estava no final, rolar para ver a nova mensagem
        // Se não, manter a posição atual
        if (wasAtBottom) {
          shouldScrollToBottomRef.current = true
        } else {
          // Restaurar posição após o render
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight
              const heightDiff = newScrollHeight - scrollHeight
              container.scrollTop = scrollPosition + heightDiff
            }
          }, 50)
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        return data.url
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    }
    return null
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && pendingImages.length === 0) || sending || ticket?.status === 'FECHADO') return

    setSending(true)
    try {
      // Upload das imagens primeiro
      const uploadedUrls: string[] = []
      for (const img of pendingImages) {
        const url = await uploadImage(img.file)
        if (url) uploadedUrls.push(url)
      }

      // Montar conteúdo da mensagem com as imagens
      let finalContent = message.trim()
      if (uploadedUrls.length > 0) {
        const imageMarkdown = uploadedUrls.map(url => `[imagem](${url})`).join('\n')
        finalContent = finalContent ? `${finalContent}\n\n${imageMarkdown}` : imageMarkdown
      }

      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: finalContent,
          attachments: uploadedUrls.map(url => ({
            url,
            filename: 'imagem.png',
            mimeType: 'image/png',
          }))
        }),
      })

      if (res.ok) {
        setMessage('')
        setPendingImages([])
        // Forçar scroll para o final ao enviar mensagem
        shouldScrollToBottomRef.current = true
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
            {isFlagged && ticket.status !== 'FECHADO' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  🚩 Este ticket foi sinalizado e está sendo analisado pela equipe.
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="card flex-1 flex flex-col min-h-[400px]">
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[500px]"
            >
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
                        ) : msg.staff?.avatar ? (
                          <Image
                            src={msg.staff.avatar}
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
                      <div className="text-gray-200 whitespace-pre-wrap break-words">
                        {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                          if (part.match(/^https?:\/\//)) {
                            return (
                              <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {part}
                              </a>
                            )
                          }
                          return <span key={i}>{part}</span>
                        })}
                      </div>
                      {msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <div key={att.id}>
                              {att.mimeType.startsWith('image/') ? (
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={att.url}
                                    alt={att.filename}
                                    className="rounded-lg max-w-[300px] max-h-[200px] object-cover hover:opacity-90 transition-opacity"
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
                {/* Preview de imagens pendentes */}
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pendingImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removePendingImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="textarea w-full pr-12"
                      rows={2}
                      placeholder="Digite sua mensagem... (Ctrl+V para colar imagens)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-3 bottom-3 text-gray-400 hover:text-primary transition-colors"
                      title="Anexar imagem"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!message.trim() && pendingImages.length === 0) || sending}
                    className="btn-primary px-6 h-fit self-end disabled:opacity-50"
                  >
                    {sending ? '...' : 'Enviar'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pressione Enter para enviar • Shift+Enter para nova linha • Ctrl+V para colar imagens
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
