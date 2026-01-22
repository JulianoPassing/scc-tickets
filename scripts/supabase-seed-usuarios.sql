-- Script SQL para criar usuários iniciais (Staff)
-- Execute este script APÓS criar o schema
-- IMPORTANTE: As senhas são hasheadas com bcrypt
-- Use o seed.js do Prisma para gerar os hashes corretos, ou execute via aplicação

-- ============================================
-- NOTA: Este script cria os usuários com senhas em texto plano
-- Para produção, use o seed.js do Prisma que faz hash das senhas
-- ============================================

-- Exemplo de como criar um staff (senha precisa ser hasheada)
-- Você pode criar manualmente via aplicação ou usar o seed.js

-- Para criar via SQL, você precisaria do hash bcrypt da senha
-- Exemplo (senha "CEO" hasheada):
-- INSERT INTO "Staff" (id, username, password, name, role, "createdAt", "updatedAt")
-- VALUES (
--   gen_random_uuid()::text,
--   'CEO',
--   '$2a$10$...', -- Hash bcrypt da senha "CEO"
--   'CEO',
--   'CEO',
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP
-- );

-- ============================================
-- RECOMENDAÇÃO: Use o seed.js do Prisma
-- ============================================
-- Execute: npm run db:seed
-- Ou crie os usuários manualmente via interface da aplicação
