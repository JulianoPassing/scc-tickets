-- Script para adicionar o cargo AJUDANTE ao enum StaffRole
-- Execute este comando no Neon Database SQL Editor

-- IMPORTANTE: No PostgreSQL, não podemos adicionar valores a enums dentro de transações
-- Este comando deve ser executado diretamente, sem BEGIN/COMMIT

-- Verificar valores atuais do enum
SELECT unnest(enum_range(NULL::"StaffRole")) AS "StaffRole";

-- Adicionar o valor 'AJUDANTE' ao enum StaffRole
-- Se o valor já existir, você receberá um erro que pode ser ignorado
ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';

-- Verificar novamente para confirmar que foi adicionado
SELECT unnest(enum_range(NULL::"StaffRole")) AS "StaffRole";
