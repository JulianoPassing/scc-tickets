# Análise de Espaço - Neon Database

## 📊 Situação Atual

**Neon Free Tier:**
- ✅ **0.5 GB** de armazenamento (não 3GB)
- ✅ Você está usando **0.03 GB** (3% do limite)
- ✅ Ainda tem **0.47 GB** disponível

## 💾 Estimativa de Uso por Tipo de Dado

### Estrutura do Banco:

**Tabelas principais:**
1. **User** - Usuários do Discord
   - ~500 bytes por usuário
   - 1000 usuários = ~0.5 MB

2. **Staff** - Atendentes
   - ~300 bytes por staff
   - 10 staffs = ~3 KB (desprezível)

3. **Ticket** - Tickets
   - ~1-2 KB por ticket
   - 10.000 tickets = ~10-20 MB

4. **Message** - Mensagens do chat
   - ~500 bytes - 2 KB por mensagem (depende do tamanho)
   - 100.000 mensagens = ~50-200 MB

5. **Attachment** - Anexos (URLs apenas, imagens no ImgBB)
   - ~200 bytes por anexo
   - 50.000 anexos = ~10 MB

6. **TicketFlag** - Sinalizações
   - ~300 bytes por flag
   - 5.000 flags = ~1.5 MB

7. **AdminSession** - Sessões (limpa automaticamente)
   - ~200 bytes por sessão
   - 1.000 sessões = ~0.2 MB

### 📈 Estimativa Total:

**Cenário Conservador (uso moderado):**
- 500 usuários
- 1.000 tickets
- 5.000 mensagens
- 500 anexos
- **Total: ~5-10 MB**

**Cenário Médio:**
- 2.000 usuários
- 5.000 tickets
- 25.000 mensagens
- 2.500 anexos
- **Total: ~30-50 MB**

**Cenário Alto (muito uso):**
- 5.000 usuários
- 20.000 tickets
- 100.000 mensagens
- 10.000 anexos
- **Total: ~150-250 MB**

**Cenário Extremo:**
- 10.000+ usuários
- 50.000+ tickets
- 500.000+ mensagens
- 50.000+ anexos
- **Total: ~500 MB+ (pode ultrapassar 0.5GB)**

## ✅ Conclusão: 0.5GB é SUFICIENTE?

**SIM, para uso normal/moderado!**

- ✅ Com 0.5GB você pode ter:
  - ~10.000-15.000 tickets
  - ~50.000-75.000 mensagens
  - ~5.000-10.000 anexos
  - Múltiplos anos de operação

- ⚠️ Pode ficar apertado se:
  - Muitos tickets com muitas mensagens
  - Muitos anexos grandes (mas URLs são pequenas)
  - Anos e anos de histórico sem limpeza

## 🎯 Estratégias de Otimização

### 1. Limpar Tickets Antigos (Recomendado)

**Opção A: Arquivar tickets fechados há mais de X meses**
```sql
-- Mover tickets fechados há mais de 6 meses para arquivo
-- (criar tabela de arquivo ou deletar)
DELETE FROM "Ticket" 
WHERE status = 'FECHADO' 
AND "closedAt" < NOW() - INTERVAL '6 months';
```

**Opção B: Manter apenas últimos N meses**
```sql
-- Deletar tickets fechados há mais de 1 ano
DELETE FROM "Ticket" 
WHERE status = 'FECHADO' 
AND "closedAt" < NOW() - INTERVAL '1 year';
```

### 2. Limpar Mensagens Antigas

```sql
-- Deletar mensagens de tickets fechados há mais de 1 ano
DELETE FROM "Message"
WHERE "ticketId" IN (
  SELECT id FROM "Ticket" 
  WHERE status = 'FECHADO' 
  AND "closedAt" < NOW() - INTERVAL '1 year'
);
```

### 3. Limpar Sessões Expiradas (automático)

O sistema já limpa sessões expiradas, mas você pode forçar:
```sql
DELETE FROM "AdminSession" 
WHERE "expiresAt" < NOW();
```

### 4. Comprimir/Arquivar Dados Antigos

Criar rotina de backup e limpeza:
- Exportar tickets antigos para arquivo
- Deletar do banco
- Manter apenas últimos 6-12 meses ativos

## 🔄 Alternativas se Precisar de Mais Espaço

### Opção 1: Neon Paid Plan
- **$19/mês** → 10 GB
- **$69/mês** → 50 GB
- ✅ Mesma infraestrutura
- ✅ Migração fácil

### Opção 2: Supabase (PostgreSQL)
- **Gratuito**: 500 MB (mesmo que Neon)
- **$25/mês**: 8 GB
- ✅ Similar ao Neon
- ✅ Mais features (auth, storage, etc)

### Opção 3: Railway
- **$5/mês** de crédito grátis
- PostgreSQL incluído
- ✅ Fácil deploy
- ⚠️ Pode consumir créditos rápido

### Opção 4: Render
- **Gratuito**: PostgreSQL limitado
- **$7/mês**: PostgreSQL dedicado
- ✅ Simples
- ⚠️ Free tier tem limitações

### Opção 5: VPS com PostgreSQL
- **$5-10/mês**: VPS básico
- ✅ Controle total
- ✅ Espaço ilimitado (disco da VPS)
- ⚠️ Precisa gerenciar

## 📋 Recomendação

**Para começar: Neon Free (0.5GB) é PERFEITO!**

1. ✅ **Use o Neon gratuito** por enquanto
2. ✅ **Monitore o uso** no dashboard
3. ✅ **Configure limpeza automática** de tickets antigos
4. ✅ **Quando chegar perto de 0.4GB**, considere:
   - Limpar dados antigos
   - Ou migrar para plano pago ($19/mês = 10GB)

## 🛠️ Script de Limpeza Automática

Você pode criar um cron job ou função para limpar automaticamente:

```sql
-- Limpar tickets fechados há mais de 6 meses
DELETE FROM "Ticket" 
WHERE status = 'FECHADO' 
AND "closedAt" < NOW() - INTERVAL '6 months';

-- Limpar sessões expiradas
DELETE FROM "AdminSession" 
WHERE "expiresAt" < NOW();
```

Ou criar uma API route no Next.js que roda periodicamente.

## 📊 Monitoramento

**Como verificar uso atual:**
1. Acesse o dashboard do Neon
2. Veja a seção "Storage"
3. Monitore regularmente

**Alertas:**
- Neon pode enviar email quando chegar perto do limite
- Configure alertas em 80% (0.4GB)

---

## ✅ Conclusão Final

**0.5GB é SUFICIENTE para:**
- ✅ Sistema de tickets em operação normal
- ✅ Múltiplos meses/anos de uso
- ✅ Milhares de tickets e mensagens

**Quando considerar upgrade:**
- ⚠️ Uso acima de 0.4GB (80%)
- ⚠️ Muitos tickets históricos acumulados
- ⚠️ Necessidade de manter histórico longo

**Recomendação:** Continue com Neon Free e monitore. Quando precisar, migre para plano pago ou limpe dados antigos.
