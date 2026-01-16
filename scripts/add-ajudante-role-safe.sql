-- Script para adicionar o cargo AJUDANTE ao enum StaffRole
-- Execute este comando no Neon Database SQL Editor
-- 
-- IMPORTANTE: Se o valor já existir, você receberá um erro que pode ser ignorado
-- O PostgreSQL não permite adicionar valores a enums dentro de transações,
-- então este comando deve ser executado diretamente

-- Verificar valores atuais do enum (antes)
SELECT unnest(enum_range(NULL::"StaffRole")) AS "StaffRole" ORDER BY "StaffRole";

-- Adicionar o valor 'AJUDANTE' ao enum StaffRole
-- Se já existir, você verá um erro: "already exists" - pode ignorar
ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';

-- Verificar valores do enum novamente (depois)
SELECT unnest(enum_range(NULL::"StaffRole")) AS "StaffRole" ORDER BY "StaffRole";
