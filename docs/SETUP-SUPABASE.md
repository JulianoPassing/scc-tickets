# Configuração do Supabase

Este guia explica como configurar o Supabase como banco de dados para o sistema de tickets.

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em **"New Project"**
4. Preencha:
   - **Name**: Nome do projeto (ex: `scc-tickets`)
   - **Database Password**: Crie uma senha forte (anote ela!)
   - **Region**: Escolha a região mais próxima
   - **Pricing Plan**: Escolha o plano (Free tier é suficiente para começar)
5. Clique em **"Create new project"**
6. Aguarde alguns minutos enquanto o projeto é criado

## 2. Obter Connection String

1. No dashboard do Supabase, vá em **Settings** > **Database**
2. Role até a seção **"Connection string"**
3. Selecione **"URI"** no dropdown
4. Copie a connection string (ela será algo como):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 1
6. Adicione `?sslmode=require` no final (se não estiver presente)

**Connection String final deve ser:**
```
postgresql://postgres:SUA_SENHA@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

## 3. Configurar Variável de Ambiente

### Localmente (`.env`)

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

### Na Vercel (Produção)

1. Acesse o dashboard da Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione ou edite a variável:
   - **Key**: `DATABASE_URL`
   - **Value**: A connection string completa
4. Clique em **Save**

## 4. Aplicar Schema ao Banco de Dados

### Opção 1: Usando Prisma Migrate (Recomendado)

```bash
# Criar migração inicial
npx prisma migrate dev --name init

# Ou se já tem dados, usar push
npx prisma db push
```

### Opção 2: Usando Prisma Push (Mais rápido)

```bash
# Aplicar schema diretamente
npx prisma db push
```

### Opção 3: SQL Direto (Se preferir)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o script SQL abaixo (ou use o Prisma para gerar automaticamente)

## 5. Adicionar Valor AJUDANTE ao Enum (Se necessário)

Se você já tinha um banco de dados e precisa adicionar o cargo AJUDANTE:

1. Acesse o **SQL Editor** no Supabase
2. Execute:

```sql
ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';
```

## 6. Popular Dados Iniciais (Seed)

Execute o seed para criar os usuários padrão:

```bash
npm run db:seed
```

Ou execute diretamente:

```bash
node prisma/seed.js
```

## 7. Verificar Conexão

Teste se a conexão está funcionando:

```bash
# Gerar Prisma Client
npx prisma generate

# Verificar conexão
npx prisma db pull
```

## 8. Configurações Adicionais do Supabase

### Habilitar Row Level Security (Opcional)

Por padrão, o Supabase tem Row Level Security habilitado. Como estamos usando Prisma diretamente, você pode desabilitar ou configurar políticas conforme necessário.

### Connection Pooling (Recomendado para Produção)

Para melhor performance em produção, use a connection string com pooling:

1. No Supabase Dashboard, vá em **Settings** > **Database**
2. Use a connection string da seção **"Connection pooling"**
3. Ela terá um formato diferente: `postgresql://postgres.xxxxx:6543/postgres`

**Importante**: Para desenvolvimento local, use a connection string normal. Para produção na Vercel, você pode usar a connection pooling.

## 9. Backup e Restauração

### Fazer Backup

No Supabase Dashboard:
1. Vá em **Database** > **Backups**
2. Clique em **"Create backup"** ou configure backups automáticos

### Restaurar Backup

1. Vá em **Database** > **Backups**
2. Selecione o backup desejado
3. Clique em **"Restore"**

## 10. Monitoramento

O Supabase oferece um dashboard de monitoramento:
- **Database** > **Usage**: Ver uso de recursos
- **Database** > **Connection Pooling**: Ver estatísticas de conexões
- **Logs**: Ver logs de queries e erros

## Troubleshooting

### Erro de Conexão

- Verifique se a senha está correta na connection string
- Certifique-se de que `?sslmode=require` está no final
- Verifique se o IP está permitido (Supabase permite todos por padrão)

### Erro de Enum

Se receber erro sobre enum `StaffRole`:
```sql
ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';
```

### Erro de Timeout

- Use connection pooling para produção
- Verifique se não há muitas conexões abertas
- Considere usar Supabase Pro para melhor performance

## Próximos Passos

Após configurar o Supabase:

1. ✅ Teste a aplicação localmente
2. ✅ Faça deploy na Vercel
3. ✅ Configure as variáveis de ambiente na Vercel
4. ✅ Teste o sistema em produção

## Recursos Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Prisma com Supabase](https://www.prisma.io/docs/guides/database/using-prisma-with-supabase)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
