-- ============================================
-- COMANDO: Deletar apenas tickets FECHADOS
-- Execute este comando no SQL Editor do Supabase
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- ============================================

-- PASSO 1: Verificar quantos tickets fechados serão deletados
SELECT 
    COUNT(*) as total_tickets_fechados,
    COUNT(DISTINCT "userId") as usuarios_afetados,
    MIN("closedAt") as ticket_mais_antigo,
    MAX("closedAt") as ticket_mais_recente
FROM "Ticket"
WHERE status = 'FECHADO';

-- Ver detalhes dos tickets fechados que serão deletados (últimos 50)
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
-- PASSO 2: Deletar apenas tickets FECHADOS
-- ATENÇÃO: Esta operação deleta:
--   - Apenas tickets com status = 'FECHADO'
--   - Todas as mensagens desses tickets (via CASCADE)
--   - Todos os anexos desses tickets (via CASCADE)
--   - Todas as sinalizações desses tickets (via CASCADE)
-- ============================================

DELETE FROM "Ticket" WHERE status = 'FECHADO';

-- ============================================
-- PASSO 3: Verificar resultado
-- ============================================

-- Ver quantos tickets fechados restam (deve ser 0)
SELECT COUNT(*) as tickets_fechados_restantes 
FROM "Ticket" 
WHERE status = 'FECHADO';

-- Ver quantos tickets ainda existem no total
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'ABERTO' THEN 1 END) as tickets_abertos,
    COUNT(CASE WHEN status = 'EM_ATENDIMENTO' THEN 1 END) as tickets_em_atendimento,
    COUNT(CASE WHEN status = 'AGUARDANDO_RESPOSTA' THEN 1 END) as tickets_aguardando,
    COUNT(CASE WHEN status = 'FECHADO' THEN 1 END) as tickets_fechados
FROM "Ticket";
