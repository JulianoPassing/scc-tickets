import { Ticket, Message, User, Staff, Attachment } from '@prisma/client'
import { getCategoryInfo } from './categories'

interface TicketWithRelations extends Ticket {
  user: User
  assignedTo?: Staff | null
  messages: (Message & {
    user?: User | null
    staff?: Staff | null
    attachments: Attachment[]
  })[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ABERTO: { label: 'Aberto', color: '#6366F1' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', color: '#F59E0B' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', color: '#EAF207' },
  FECHADO: { label: 'Fechado', color: '#EF4444' },
}

export function generateTranscriptHTML(ticket: TicketWithRelations): string {
  const categoryInfo = getCategoryInfo(ticket.category)
  const statusInfo = STATUS_LABELS[ticket.status] || { label: ticket.status, color: '#EAF207' }
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMessageContent = (content: string) => {
    // Converter quebras de linha
    return content
      .replace(/\n/g, '<br>')
      .replace(/\[imagem\]\((.*?)\)/g, '<a href="$1" target="_blank" style="color: #EAF207;">[Imagem]</a>')
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript - Ticket #${ticket.ticketNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Poppins', sans-serif;
      background: #0D0D0D;
      color: #FFFFFF;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      background: #1A1A1A;
      border: 1px solid #30363D;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .category-emoji {
      font-size: 48px;
    }

    .header-info h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #FFFFFF;
    }

    .header-info .ticket-number {
      font-size: 14px;
      color: #B0B0B0;
      margin-bottom: 4px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: ${statusInfo.color}33;
      color: ${statusInfo.color};
      border: 1px solid ${statusInfo.color}66;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .info-item {
      background: #0D0D0D;
      border: 1px solid #30363D;
      border-radius: 8px;
      padding: 12px;
    }

    .info-label {
      font-size: 12px;
      color: #B0B0B0;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 14px;
      color: #FFFFFF;
      font-weight: 500;
    }

    .messages-container {
      background: #1A1A1A;
      border: 1px solid #30363D;
      border-radius: 12px;
      padding: 24px;
    }

    .messages-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #FFFFFF;
    }

    .message {
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .message-user {
      background: #EAF2071A;
      border-left-color: #EAF207;
    }

    .message-staff {
      background: #3B82F61A;
      border-left-color: #3B82F6;
    }

    .message-system {
      background: #6B72801A;
      border-left-color: #6B7280;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }

    .message-avatar-placeholder {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #3B82F6;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 14px;
    }

    .message-author {
      font-weight: 600;
      font-size: 14px;
      color: #FFFFFF;
    }

    .message-time {
      font-size: 12px;
      color: #B0B0B0;
    }

    .message-content {
      margin-top: 8px;
      color: #E5E7EB;
      font-size: 14px;
      line-height: 1.6;
    }

    .attachments {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .attachment-image {
      max-width: 300px;
      max-height: 200px;
      border-radius: 8px;
      border: 1px solid #30363D;
    }

    .attachment-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #0D0D0D;
      border: 1px solid #30363D;
      border-radius: 8px;
      color: #EAF207;
      text-decoration: none;
      font-size: 12px;
      transition: all 0.2s;
    }

    .attachment-link:hover {
      border-color: #EAF207;
    }

    .footer {
      margin-top: 24px;
      padding: 16px;
      text-align: center;
      color: #B0B0B0;
      font-size: 12px;
      border-top: 1px solid #30363D;
    }

    @media print {
      body {
        background: #FFFFFF;
        color: #000000;
      }

      .header, .messages-container {
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
      }

      .info-item {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
      }

      .message {
        border: 1px solid #E5E7EB;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="category-emoji">${categoryInfo?.emoji || '📋'}</div>
        <div class="header-info">
          <h1>${ticket.subject}</h1>
          <div class="ticket-number">Ticket #${ticket.ticketNumber}</div>
          <span class="status-badge">${statusInfo.label}</span>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Categoria</div>
          <div class="info-value">${categoryInfo?.emoji || ''} ${categoryInfo?.name || ticket.category}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Aberto por</div>
          <div class="info-value">${ticket.user.displayName || ticket.user.username}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Discord ID</div>
          <div class="info-value">${ticket.user.discordId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data de Abertura</div>
          <div class="info-value">${formatDate(ticket.createdAt)}</div>
        </div>
        ${ticket.assignedTo ? `
        <div class="info-item">
          <div class="info-label">Atendente</div>
          <div class="info-value">${ticket.assignedTo.name} (${ticket.assignedTo.role})</div>
        </div>
        ` : ''}
        ${ticket.closedAt ? `
        <div class="info-item">
          <div class="info-label">Fechado em</div>
          <div class="info-value">${formatDate(ticket.closedAt)}</div>
        </div>
        ` : ''}
        ${ticket.closedReason ? `
        <div class="info-item" style="grid-column: 1 / -1;">
          <div class="info-label">Motivo do Fechamento</div>
          <div class="info-value">${ticket.closedReason}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="messages-container">
      <div class="messages-title">Histórico de Mensagens (${ticket.messages.length})</div>
      
      ${ticket.messages.map((msg) => {
        const isSystem = msg.isSystemMessage
        const isStaff = !!msg.staff
        const author = isSystem 
          ? 'Sistema' 
          : isStaff 
            ? `${msg.staff?.name} (${msg.staff?.role})`
            : msg.user?.displayName || msg.user?.username || 'Usuário'
        
        const avatar = isSystem 
          ? null 
          : isStaff 
            ? msg.staff?.avatar 
            : msg.user?.avatar
        
        const messageClass = isSystem 
          ? 'message-system' 
          : isStaff 
            ? 'message-staff' 
            : 'message-user'

        return `
        <div class="message ${messageClass}">
          <div class="message-header">
            ${avatar ? `
            <img src="${avatar}" alt="Avatar" class="message-avatar" />
            ` : `
            <div class="message-avatar-placeholder">${author[0].toUpperCase()}</div>
            `}
            <div>
              <div class="message-author">${author}</div>
              <div class="message-time">${formatDate(msg.createdAt)}</div>
            </div>
          </div>
          <div class="message-content">${formatMessageContent(msg.content)}</div>
          ${msg.attachments.length > 0 ? `
          <div class="attachments">
            ${msg.attachments.map((att) => {
              if (att.mimeType.startsWith('image/')) {
                return `<img src="${att.url}" alt="${att.filename}" class="attachment-image" />`
              } else {
                return `<a href="${att.url}" target="_blank" class="attachment-link">📎 ${att.filename}</a>`
              }
            }).join('')}
          </div>
          ` : ''}
        </div>
        `
      }).join('')}
    </div>

    <div class="footer">
      <p>Transcript gerado em ${formatDate(new Date())}</p>
      <p>StreetCarClub - Sistema de Tickets</p>
    </div>
  </div>
</body>
</html>`
}
