-- ============================================
-- COMANDO SIMPLES: Deletar todos os tickets fechados
-- Copie e cole este comando no Neon Database SQL Editor
-- ============================================

-- Primeiro, veja quantos serão deletados:
SELECT COUNT(*) as total FROM "Ticket" WHERE status = 'FECHADO';

-- Depois, execute para deletar:
DELETE FROM "Ticket" WHERE status = 'FECHADO';

-- ============================================
-- COMANDO ALTERNATIVO: Deletar apenas tickets fechados há mais de 30 dias
-- (Mantém histórico recente)
-- ============================================

-- Ver quantos serão deletados:
SELECT COUNT(*) as total 
FROM "Ticket" 
WHERE status = 'FECHADO' 
  AND "closedAt" < NOW() - INTERVAL '30 days';

-- Deletar:
DELETE FROM "Ticket" 
WHERE status = 'FECHADO' 
  AND "closedAt" < NOW() - INTERVAL '30 days';
