# Troubleshooting - Conexão Supabase na Vercel

## Erro: "Can't reach database server"

Se você está recebendo este erro na Vercel, siga estas soluções **na ordem**:

## ✅ Solução 1: Verificar se o Projeto Supabase está Ativo

**IMPORTANTE:** Projetos Free do Supabase podem pausar após inatividade!

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Verifique se o projeto está **ativo** (não pausado)
3. Se estiver pausado, clique em **"Restore"** ou **"Resume"**
4. Aguarde alguns minutos para o projeto ficar totalmente ativo

## ✅ Solução 2: Verificar Restrições de IP/Firewall

O Supabase pode estar bloqueando conexões da Vercel:

1. No Supabase, vá em **Settings** > **Database**
2. Role até a seção **"Network Restrictions"** ou **"IP Restrictions"**
3. Se houver restrições configuradas:
   - **Remova todas as restrições** (para permitir conexões de qualquer lugar)
   - **OU** adicione `0.0.0.0/0` para permitir todas as conexões
4. Salve as alterações

## ✅ Solução 3: Verificar Connection String na Vercel

Certifique-se de que a connection string está correta:

### Connection String Correta (senha atual: `streetticketsnoelmelhor`):

```env
postgresql://postgres:streetticketsnoelmelhor@db.hwsyhgswvkmlwirrhmlv.supabase.co:5432/postgres?sslmode=require
```

**Verifique na Vercel:**
1. Settings > Environment Variables
2. Encontre `DATABASE_URL`
3. Certifique-se de que:
   - ✅ A senha está correta: `streetticketsnoelmelhor`
   - ✅ O host está correto: `db.hwsyhgswvkmlwirrhmlv.supabase.co`
   - ✅ A porta está correta: `5432`
   - ✅ Tem `?sslmode=require` no final
   - ✅ **NÃO tem aspas** na variável (a Vercel adiciona automaticamente)

## ✅ Solução 4: Forçar Novo Deploy

Após atualizar a variável de ambiente:

1. Na Vercel, vá em **Deployments**
2. Clique nos **três pontos** (`...`) do último deploy
3. Selecione **"Redeploy"**
4. Aguarde o deploy completar
5. Teste novamente

## ✅ Solução 5: Testar Conexão no Supabase SQL Editor

Para verificar se o banco está acessível:

1. No Supabase, vá em **SQL Editor**
2. Execute uma query simples:
   ```sql
   SELECT version();
   ```
3. Se funcionar, o banco está ativo e acessível

## ✅ Solução 6: Verificar Logs do Supabase

1. No Supabase, vá em **Logs** > **Postgres Logs**
2. Verifique se há erros de conexão
3. Se houver muitos erros, pode indicar problema de autenticação

## 🔍 Checklist Completo

Antes de reportar o problema, verifique:

- [ ] Projeto Supabase está **ativo** (não pausado)
- [ ] **Não há restrições de IP** no Supabase
- [ ] Connection string na Vercel está **correta** (sem aspas, com `?sslmode=require`)
- [ ] **Novo deploy** foi feito após atualizar a variável
- [ ] Senha do banco está **correta**: `streetticketsnoelmelhor`
- [ ] Testou a conexão no **SQL Editor** do Supabase

## 🆘 Ainda não funciona?

Se nenhuma das soluções acima funcionar:

1. **Verifique os logs da Vercel** para mais detalhes do erro
2. **Teste criar um novo projeto Supabase** (pode ser problema específico do projeto)
3. **Verifique se há problemas no status do Supabase**: https://status.supabase.com

## 📝 Connection String de Referência

**Connection String Direta (Recomendada):**
```env
postgresql://postgres:streetticketsnoelmelhor@db.hwsyhgswvkmlwirrhmlv.supabase.co:5432/postgres?sslmode=require
```

**Connection String com Pooling (Alternativa):**
```env
postgresql://postgres.hwsyhgswvkmlwirrhmlv:streetticketsnoelmelhor@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```
