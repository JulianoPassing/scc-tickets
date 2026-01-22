-- ============================================
-- COMANDO SIMPLES: Deletar TODOS os tickets
-- Copie e cole este comando no SQL Editor do Supabase
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- ============================================

-- Primeiro, veja quantos serão deletados:
SELECT COUNT(*) as total FROM "Ticket";

-- Depois, execute para deletar TODOS os tickets:
DELETE FROM "Ticket";

-- Verificar se foi deletado (deve retornar 0):
SELECT COUNT(*) as tickets_restantes FROM "Ticket";
