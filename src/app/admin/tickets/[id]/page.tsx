'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCategoryInfo, CATEGORIES } from '@/lib/categories'
import { ROLE_PERMISSIONS } from '@/lib/permissions'

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
  lastAttendant?: {
    id: string
    name: string
    role: string
    avatar?: string
  } | null
  messages: Message[]
}

interface PendingImage {
  file: File
  preview: string
}

interface TicketFlagInfo {
  id: string
  message?: string
  resolved: boolean
  createdAt: string
  flaggedToRole: string
  flaggedBy: {
    id: string
    name: string
    role: string
    avatar?: string
  }
}

interface AvailableRole {
  id: string
  name: string
}

const ROLE_LABELS: Record<string, string> = {
  SUPORTE: 'Suporte',
  AJUDANTE: 'Ajudante',
  MODERADOR: 'Moderador',
  COORDENADOR: 'Coordenador',
  COMMUNITY_MANAGER: 'Community Manager',
  DEV: 'Desenvolvedor',
  CEO: 'CEO',
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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  
  // Modais
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newCategory, setNewCategory] = useState('')
  
  // Sinalização
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [flagMessage, setFlagMessage] = useState('')
  const [ticketFlags, setTicketFlags] = useState<TicketFlagInfo[]>([])
  const [flaggedForMe, setFlaggedForMe] = useState<TicketFlagInfo | null>(null)
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (staff && ticketId) {
      fetchTicket()
      fetchFlags()
      
      // Auto-refresh do chat a cada 10 segundos
      refreshIntervalRef.current = setInterval(() => {
        fetchMessagesOnly()
      }, 10000)
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [staff, ticketId])

  // Detectar se o usuário está perto do final do scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100 // 100px de tolerância
      shouldAutoScrollRef.current = isNearBottom
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Só fazer scroll automático se o usuário estiver perto do final
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom()
    }
  }, [ticket?.messages])

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
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`)
      if (!res.ok) return
      
      const data = await res.json()
      if (!data.ticket) return
      
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
        
        // Atualizar apenas as mensagens e status
        setTicket(prev => prev ? { ...prev, messages: newMessages, status: data.ticket.status } : data.ticket)
        
        // Atualizar referência da última mensagem
        lastMessageIdRef.current = lastNewMessageId
        
        // Restaurar posição do scroll após o render
        // Se o usuário estava no final, rolar para ver a nova mensagem
        // Se não, manter a posição atual
        setTimeout(() => {
          if (container) {
            if (wasAtBottom) {
              // Estava no final, rolar suavemente para a nova mensagem
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            } else {
              // Manter a posição relativa ao conteúdo anterior
              const newScrollHeight = container.scrollHeight
              const heightDiff = newScrollHeight - scrollHeight
              container.scrollTop = scrollPosition + heightDiff
            }
          }
        }, 50)
      }
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error)
    }
  }

  const fetchFlags = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/flag`)
      if (res.ok) {
        const data = await res.json()
        setTicketFlags(data.flags || [])
        // Verificar se este ticket foi sinalizado para o cargo do atendente atual
        const flagForMe = data.flags?.find(
          (f: TicketFlagInfo) => f.flaggedToRole === staff?.role && !f.resolved
        )
        setFlaggedForMe(flagForMe || null)
      }
    } catch (error) {
      console.error('Erro ao carregar sinalizações:', error)
    }
  }

  const fetchAvailableRoles = async () => {
    if (!ticket) return
    setLoadingRoles(true)
    try {
      const res = await fetch(`/api/admin/staff/available?category=${ticket.category}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableRoles(data.roles || [])
      }
    } catch (error) {
      console.error('Erro ao carregar cargos:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleFlagTicket = async () => {
    if (selectedRoles.length === 0) return
    
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roles: selectedRoles, 
          message: flagMessage || undefined 
        }),
      })

      if (res.ok) {
        setShowFlagModal(false)
        setSelectedRoles([])
        setFlagMessage('')
        fetchTicket()
        fetchFlags()
        alert('Ticket sinalizado com sucesso!')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao sinalizar ticket')
      }
    } catch (error) {
      console.error('Erro ao sinalizar ticket:', error)
      alert('Erro ao sinalizar ticket')
    }
  }

  const handleResolveFlag = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/flag`, {
        method: 'PATCH',
      })

      if (res.ok) {
        setFlaggedForMe(null)
        fetchFlags()
      }
    } catch (error) {
      console.error('Erro ao resolver sinalização:', error)
    }
  }

  const handleExportTranscript = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/export`)
      if (!res.ok) {
        alert('Erro ao exportar transcript')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-${ticket?.ticketNumber}-transcript.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar transcript:', error)
      alert('Erro ao exportar transcript')
    }
  }

  const scrollToBottom = () => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Validar tamanho (max 32MB - limite do ImgBB)
      const maxSize = 32 * 1024 * 1024
      if (file.size > maxSize) {
        console.error('Arquivo muito grande (máx 32MB)')
        return null
      }

      // Obter chave do ImgBB
      const keyRes = await fetch('/api/upload/key')
      if (!keyRes.ok) {
        console.error('Erro ao obter chave de upload')
        return null
      }
      const { key } = await keyRes.json()

      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove o prefixo "data:image/xxx;base64,"
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload direto para ImgBB (evita limite de 4.5MB da Vercel)
      const formData = new FormData()
      formData.append('key', key)
      formData.append('image', base64)
      formData.append('name', file.name.split('.')[0])

      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        return data.data?.url || data.data?.display_url
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

      // Montar conteúdo da mensagem
      let finalContent = message.trim()
      if (uploadedUrls.length > 0) {
        const imageMarkdown = uploadedUrls.map(url => `[imagem](${url})`).join('\n')
        finalContent = finalContent ? `${finalContent}\n\n${imageMarkdown}` : imageMarkdown
      }

      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: finalContent, 
          notifyUser,
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
        shouldAutoScrollRef.current = true
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
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao renomear ticket')
      }
    } catch (error) {
      console.error('Erro ao renomear ticket:', error)
      alert('Erro ao renomear ticket')
    }
  }

  const handleChangeCategory = async () => {
    if (!newCategory || newCategory === ticket?.category) {
      setShowCategoryModal(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      })

      if (res.ok) {
        setShowCategoryModal(false)
        fetchTicket()
        alert('Categoria alterada com sucesso!')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao alterar categoria')
      }
    } catch (error) {
      console.error('Erro ao alterar categoria:', error)
      alert('Erro ao alterar categoria')
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="w-full px-4 py-4">
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportTranscript}
                className="btn-secondary text-sm py-2"
                title="Exportar transcript HTML"
              >
                📄 Exportar
              </button>
              {ticket.status !== 'FECHADO' && (
                <>
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
                  <button
                    onClick={() => {
                      setNewCategory(ticket.category)
                      setShowCategoryModal(true)
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    📁 Alterar Categoria
                  </button>
                  <button
                    onClick={() => {
                      setShowFlagModal(true)
                      fetchAvailableRoles()
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    🚩 Sinalizar
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Banner de sinalização */}
      {flaggedForMe && (
        <div className="bg-red-500/10 border-b border-red-500/30">
          <div className="w-full px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚩</span>
                <div>
                  <p className="font-medium text-red-400">
                    Este ticket foi sinalizado para seu cargo por {flaggedForMe.flaggedBy.name}
                  </p>
                  {flaggedForMe.message && (
                    <p className="text-sm text-gray-400">
                      Mensagem: &ldquo;{flaggedForMe.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleResolveFlag}
                className="btn-secondary text-sm py-1.5 px-4"
              >
                ✓ Marcar como resolvido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex-1 flex gap-6 px-4 pb-6 min-h-0 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="card flex-1 flex flex-col min-h-0">
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0"
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

            {/* Input */}
            {ticket.status !== 'FECHADO' ? (
              <form onSubmit={handleSendMessage} className="border-t border-border pt-2 pb-2 flex-shrink-0">
                {/* Preview de imagens pendentes */}
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-lg border border-border"
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

                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="textarea w-full pr-10 text-sm"
                      rows={2}
                      placeholder="Digite sua resposta... (Ctrl+V para colar imagens)"
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
                      className="absolute right-2 bottom-2 text-gray-400 hover:text-primary transition-colors"
                      title="Anexar imagem"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyUser}
                        onChange={(e) => setNotifyUser(e.target.checked)}
                        className="rounded border-border"
                      />
                      Notificar usuário via Discord
                    </label>
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      Ctrl+V para colar imagens
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={(!message.trim() && pendingImages.length === 0) || sending}
                    className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
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
        <aside className="w-80 flex-shrink-0 space-y-6 overflow-y-auto max-h-full">
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
              <div className="flex items-center justify-between">
                <p>
                  <span className="text-gray-400">Categoria:</span>{' '}
                  {categoryInfo?.emoji} {categoryInfo?.name}
                </p>
                {ticket.status !== 'FECHADO' && (
                  <button
                    onClick={() => {
                      setNewCategory(ticket.category)
                      setShowCategoryModal(true)
                    }}
                    className="text-xs text-primary hover:underline"
                    title="Alterar categoria"
                  >
                    Alterar
                  </button>
                )}
              </div>
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
              {ticket.lastAttendant ? (
                <p>
                  <span className="text-gray-400">Atendente:</span>{' '}
                  {ticket.lastAttendant.name}
                </p>
              ) : ticket.assignedTo && (
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

      {/* Modal Alterar Categoria */}
      {showCategoryModal && staff && ticket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Alterar Categoria</h2>
            <p className="text-gray-400 mb-4 text-sm">
              Selecione a nova categoria para este ticket. Apenas categorias que você tem acesso são exibidas.
            </p>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="input mb-4 w-full"
            >
              {CATEGORIES.filter((cat) => 
                ROLE_PERMISSIONS[staff.role]?.includes(cat.id)
              ).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
            {newCategory !== ticket.category && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                ⚠️ A categoria será alterada de <strong>{getCategoryInfo(ticket.category as any)?.name}</strong> para <strong>{getCategoryInfo(newCategory as any)?.name}</strong>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleChangeCategory} className="btn-primary flex-1">
                Alterar Categoria
              </button>
              <button 
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategory('')
                }} 
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sinalizar */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">🚩 Sinalizar Ticket</h2>
            <p className="text-gray-400 mb-4">
              Selecione os cargos para sinalizar este ticket. Apenas cargos com acesso à categoria são listados.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Cargos</label>
              {loadingRoles ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                  <span className="ml-2 text-gray-400">Carregando cargos...</span>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                  Nenhum cargo disponível para esta categoria.
                </div>
              ) : (
                <div className="space-y-2 border border-border rounded-lg p-2">
                  {availableRoles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedRoles.includes(role.id)
                          ? 'bg-primary/20 border border-primary'
                          : 'hover:bg-card border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.id])
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role.id))
                          }
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="font-medium">{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Mensagem (opcional)</label>
              <textarea
                value={flagMessage}
                onChange={(e) => setFlagMessage(e.target.value)}
                className="textarea w-full"
                rows={2}
                placeholder="Ex: Preciso de ajuda com esse caso..."
              />
            </div>

            {/* Sinalizações ativas */}
            {ticketFlags.filter(f => !f.resolved).length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400 font-medium mb-2">Sinalizações ativas:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  {ticketFlags.filter(f => !f.resolved).map((flag) => (
                    <li key={flag.id} className="flex items-center gap-2">
                      <span>→</span>
                      <span>{flag.flaggedBy.name} sinalizou para</span>
                      <span className="font-medium text-white">{ROLE_LABELS[flag.flaggedToRole] || flag.flaggedToRole}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={handleFlagTicket} 
                className="btn-primary flex-1"
                disabled={selectedRoles.length === 0}
              >
                Sinalizar {selectedRoles.length > 0 && `(${selectedRoles.length})`}
              </button>
              <button 
                onClick={() => {
                  setShowFlagModal(false)
                  setSelectedRoles([])
                  setFlagMessage('')
                }} 
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
