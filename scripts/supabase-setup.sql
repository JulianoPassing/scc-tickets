-- Script SQL para configuração inicial do Supabase
-- Execute este script no SQL Editor do Supabase após criar o projeto

-- ============================================
-- IMPORTANTE: Este script é apenas para referência
-- Recomendamos usar Prisma para gerenciar o schema:
--   npx prisma db push
-- ============================================

-- Verificar se os enums já existem (criados pelo Prisma)
-- Se não existirem, o Prisma criará automaticamente

-- Verificar valores do enum StaffRole
SELECT unnest(enum_range(NULL::"StaffRole")) AS "StaffRole";

-- Se precisar adicionar AJUDANTE manualmente (caso o Prisma não tenha criado):
-- ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';

-- Verificar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verificar índices
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
