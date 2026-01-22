-- Script SQL completo para criar o schema no Supabase
-- Execute este script no SQL Editor do Supabase
-- IMPORTANTE: Execute na ordem apresentada!

-- ============================================
-- 1. CRIAR ENUMS
-- ============================================

-- Enum StaffRole
CREATE TYPE "StaffRole" AS ENUM (
  'SUPORTE',
  'AJUDANTE',
  'MODERADOR',
  'COORDENADOR',
  'COMMUNITY_MANAGER',
  'DEV',
  'CEO'
);

-- Enum TicketCategory
CREATE TYPE "TicketCategory" AS ENUM (
  'SUPORTE',
  'BUGS',
  'DENUNCIAS',
  'DOACOES',
  'BOOST',
  'CASAS',
  'REVISAO'
);

-- Enum TicketStatus
CREATE TYPE "TicketStatus" AS ENUM (
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_RESPOSTA',
  'FECHADO'
);

-- ============================================
-- 2. CRIAR TABELAS
-- ============================================

-- Tabela User
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "avatar" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Tabela Staff
CREATE TABLE "Staff" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL,
  "avatar" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- Tabela Ticket
CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "ticketNumber" SERIAL NOT NULL,
  "category" "TicketCategory" NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  "assignedToId" TEXT,
  "discordChannelId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "closedReason" TEXT,

  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- Tabela Message
CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT,
  "staffId" TEXT,
  "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Tabela Attachment
CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "messageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- Tabela TicketFlag
CREATE TABLE "TicketFlag" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "flaggedById" TEXT NOT NULL,
  "flaggedToRole" "StaffRole" NOT NULL,
  "message" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "TicketFlag_pkey" PRIMARY KEY ("id")
);

-- Tabela AdminSession
CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 3. CRIAR CONSTRAINTS E RELACIONAMENTOS
-- ============================================

-- Unique constraints
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "Staff_username_key" ON "Staff"("username");
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");
CREATE UNIQUE INDEX "TicketFlag_ticketId_flaggedToRole_key" ON "TicketFlag"("ticketId", "flaggedToRole");

-- Foreign keys - Ticket
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys - Message
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys - Attachment
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys - TicketFlag
ALTER TABLE "TicketFlag" ADD CONSTRAINT "TicketFlag_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketFlag" ADD CONSTRAINT "TicketFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys - AdminSession
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 4. CRIAR ÍNDICES
-- ============================================

CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_category_idx" ON "Ticket"("category");
CREATE INDEX "Message_ticketId_idx" ON "Message"("ticketId");
CREATE INDEX "TicketFlag_flaggedToRole_idx" ON "TicketFlag"("flaggedToRole");
CREATE INDEX "TicketFlag_ticketId_idx" ON "TicketFlag"("ticketId");

-- ============================================
-- 5. CRIAR FUNÇÃO PARA UPDATED_AT AUTOMÁTICO
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON "Staff"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_updated_at BEFORE UPDATE ON "Ticket"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRONTO! Schema criado com sucesso
-- ============================================
