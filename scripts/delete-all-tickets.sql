-- ============================================
-- COMANDO: Deletar TODOS os tickets
-- Execute este comando no SQL Editor do Supabase
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- ============================================

-- PASSO 1: Verificar quantos tickets serão deletados
SELECT 
    COUNT(*) as total_tickets,
    COUNT(DISTINCT "userId") as usuarios_afetados,
    COUNT(CASE WHEN status = 'ABERTO' THEN 1 END) as tickets_abertos,
    COUNT(CASE WHEN status = 'EM_ATENDIMENTO' THEN 1 END) as tickets_em_atendimento,
    COUNT(CASE WHEN status = 'AGUARDANDO_RESPOSTA' THEN 1 END) as tickets_aguardando,
    COUNT(CASE WHEN status = 'FECHADO' THEN 1 END) as tickets_fechados
FROM "Ticket";

-- Ver detalhes dos tickets que serão deletados (últimos 50)
SELECT 
    "ticketNumber",
    category,
    subject,
    status,
    "createdAt",
    "closedAt"
FROM "Ticket"
ORDER BY "createdAt" DESC
LIMIT 50;

-- ============================================
-- PASSO 2: Deletar TODOS os tickets
-- ATENÇÃO: Esta operação deleta:
--   - Todos os tickets
--   - Todas as mensagens (via CASCADE)
--   - Todos os anexos (via CASCADE)
--   - Todas as sinalizações (via CASCADE)
-- ============================================

DELETE FROM "Ticket";

-- ============================================
-- PASSO 3: Verificar se foi deletado
-- ============================================

SELECT COUNT(*) as tickets_restantes FROM "Ticket";
-- Deve retornar 0
