# Setup Rápido - Supabase

## Connection String Configurada

Sua connection string do Supabase:

```env
DATABASE_URL="postgresql://postgres:Ticketssccc@95@db.hwsyhgswvkmlwirrhmlv.supabase.co:5432/postgres?sslmode=require"
```

**Se der erro de conexão, use a versão com encoding:**
```env
DATABASE_URL="postgresql://postgres:Ticketssccc%4095@db.hwsyhgswvkmlwirrhmlv.supabase.co:5432/postgres?sslmode=require"
```

## Próximos Passos

### 1. Criar arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com a connection string acima e suas outras variáveis de ambiente.

### 2. Aplicar Schema ao Banco

```bash
npx prisma db push
```

Isso criará todas as tabelas, enums e relacionamentos no Supabase.

### 3. Popular Dados Iniciais

```bash
npm run db:seed
```

Isso criará os usuários padrão (CEO, Community Manager, Coordenador, Moderador, Suporte).

### 4. Verificar no Supabase

Após executar `npx prisma db push`, vá no Supabase:
- **Database** > **Tables** - Você deve ver todas as tabelas criadas
- **Database** > **Enumerated Types** - Você deve ver os enums (StaffRole, TicketCategory, TicketStatus)

## Troubleshooting

### Erro de conexão
- Verifique se a senha está correta
- Tente usar a versão com encoding (`%40` ao invés de `@`)
- Certifique-se de que `?sslmode=require` está no final

### Erro de enum
Se receber erro sobre enum `StaffRole`:
```sql
ALTER TYPE "StaffRole" ADD VALUE 'AJUDANTE';
```
