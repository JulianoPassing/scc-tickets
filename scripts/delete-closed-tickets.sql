-- Script para deletar tickets finalizados (status FECHADO)
-- Use este comando no Neon Database SQL Editor

-- ============================================
-- PASSO 1: Verificar quantos tickets serão deletados
-- Execute este primeiro para ver o que será deletado
-- ============================================
SELECT 
    COUNT(*) as total_tickets_fechados,
    COUNT(DISTINCT "userId") as usuarios_afetados,
    MIN("closedAt") as ticket_mais_antigo,
    MAX("closedAt") as ticket_mais_recente
FROM "Ticket"
WHERE status = 'FECHADO';

-- Ver detalhes dos tickets que serão deletados
SELECT 
    "ticketNumber",
    category,
    subject,
    "closedAt",
    "closedReason",
    "createdAt"
FROM "Ticket"
WHERE status = 'FECHADO'
ORDER BY "closedAt" DESC
LIMIT 50;

-- ============================================
-- PASSO 2: Deletar tickets finalizados
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Execute apenas após verificar o PASSO 1
-- ============================================

-- Opção 1: Deletar TODOS os tickets fechados
BEGIN;

DELETE FROM "Ticket"
WHERE status = 'FECHADO';

-- Verificar quantos foram deletados
SELECT ROW_COUNT();

-- Se estiver tudo certo, confirme com COMMIT
-- Se quiser cancelar, use ROLLBACK
COMMIT;

-- ============================================
-- Opção 2: Deletar apenas tickets fechados há mais de X dias
-- (Recomendado para manter histórico recente)
-- ============================================

-- Exemplo: Deletar tickets fechados há mais de 30 dias
BEGIN;

DELETE FROM "Ticket"
WHERE status = 'FECHADO'
  AND "closedAt" < NOW() - INTERVAL '30 days';

-- Verificar quantos foram deletados
SELECT ROW_COUNT();

COMMIT;

-- ============================================
-- Opção 3: Deletar tickets fechados há mais de X dias, mas manter os últimos N
-- (Mantém sempre os últimos 100 tickets fechados, por exemplo)
-- ============================================

BEGIN;

-- Deletar tickets fechados há mais de 30 dias, exceto os últimos 100
WITH tickets_para_deletar AS (
    SELECT id
    FROM "Ticket"
    WHERE status = 'FECHADO'
      AND "closedAt" < NOW() - INTERVAL '30 days'
      AND id NOT IN (
          SELECT id
          FROM "Ticket"
          WHERE status = 'FECHADO'
          ORDER BY "closedAt" DESC
          LIMIT 100
      )
)
DELETE FROM "Ticket"
WHERE id IN (SELECT id FROM tickets_para_deletar);

SELECT ROW_COUNT();

COMMIT;
