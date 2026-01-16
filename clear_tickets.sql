-- Script para deletar todos os tickets e dados relacionados
-- Execute este script no Neon SQL Editor

-- 1. Deletar todos os anexos (attachments)
DELETE FROM "Attachment";

-- 2. Deletar todas as mensagens
DELETE FROM "Message";

-- 3. Deletar todas as sinalizações (flags)
DELETE FROM "TicketFlag";

-- 4. Deletar todos os tickets
DELETE FROM "Ticket";

-- 5. Resetar o contador de ticketNumber para começar do 1
ALTER SEQUENCE "Ticket_ticketNumber_seq" RESTART WITH 1;

-- Verificar se foi deletado tudo
SELECT 
  (SELECT COUNT(*) FROM "Ticket") as tickets,
  (SELECT COUNT(*) FROM "Message") as messages,
  (SELECT COUNT(*) FROM "Attachment") as attachments,
  (SELECT COUNT(*) FROM "TicketFlag") as flags;
