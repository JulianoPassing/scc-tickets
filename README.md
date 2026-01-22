# Sistema de Tickets - StreetCarClub

Sistema completo de atendimento de tickets integrado com Discord, desenvolvido com Next.js e Prisma.

## Funcionalidades

### Para Usuários
- Login via Discord OAuth
- Abrir tickets em 7 categorias: Suporte, Bugs, Denúncias, Doações, Boost, Casas, Revisão
- Chat em tempo real com anexos (imagens, arquivos)
- Visualizar histórico de tickets
- Receber notificações via Discord

### Para Atendentes (Staff)
- Login com usuário/senha próprio
- Painel administrativo com dashboard
- Filtros por status e categoria
- Ações: Assumir, Renomear, Fechar ticket
- Enviar notificações via Discord para o usuário
- Acesso baseado em cargo:
  - **Suporte/Moderador**: Suporte, Bugs, Boost, Casas
  - **Coordenador/CM/CEO**: Todas as categorias + Denúncias e Revisão

### Integração Discord
- Bot envia botões que redirecionam para o portal web
- Notificações automáticas via DM

## Tecnologias

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: NextAuth.js (Discord OAuth) + JWT para admin
- **Deploy**: Vercel

## Instalação

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/scc-tickets.git
cd scc-tickets
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Discord OAuth (Portal de Desenvolvedores do Discord)
DISCORD_CLIENT_ID=seu_client_id
DISCORD_CLIENT_SECRET=seu_client_secret
DISCORD_BOT_TOKEN=seu_bot_token

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta_aqui

# Database (PostgreSQL - Vercel Postgres, Supabase, etc)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Discord Guild ID
DISCORD_GUILD_ID=seu_guild_id

# Admin JWT Secret
ADMIN_JWT_SECRET=outra_chave_secreta_para_admin
```

### 3. Configurar o banco de dados

```bash
# Aplicar schema ao banco
npx prisma db push

# Criar staffs iniciais
npm run db:seed
```

**Usuários padrão criados:**
- CEO / CEO (CEO)
- Community / Community (Community Manager)
- Coordenador / Coordenador
- Moderador / Moderador
- Suporte / Suporte

### 4. Executar em desenvolvimento

```bash
npm run dev
```

Acesse:
- Portal: http://localhost:3000
- Painel Admin: http://localhost:3000/admin

## Deploy na Vercel

### 1. Conectar repositório

1. Acesse [vercel.com](https://vercel.com)
2. Importe o repositório do GitHub
3. Configure as variáveis de ambiente na Vercel

### 2. Banco de Dados

Recomendamos usar **Vercel Postgres** ou **Supabase**:

**Vercel Postgres:**
1. No dashboard da Vercel, vá em Storage > Create Database
2. Selecione Postgres
3. A conexão será adicionada automaticamente

**Supabase:**
1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em Settings > Database
3. Copie a Connection String (URI) e substitua `[YOUR-PASSWORD]` pela senha do projeto
4. Adicione `?sslmode=require` no final da connection string
5. Adicione como DATABASE_URL na Vercel
6. Execute `npx prisma db push` para aplicar o schema
7. Execute `npm run db:seed` para criar dados iniciais

📖 **Guia completo**: Veja [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md) para instruções detalhadas

### 3. Discord OAuth

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma aplicação ou use existente
3. Em OAuth2 > Redirects, adicione: `https://seu-dominio.vercel.app/api/auth/callback/discord`
4. Copie Client ID e Client Secret

### 4. Deploy

Após configurar tudo, faça push para main/master e a Vercel fará o deploy automaticamente.

## Configurar Bot Discord

Adicione a variável `WEB_TICKET_URL` no arquivo `.env` do bot:

```env
WEB_TICKET_URL=https://seu-dominio.vercel.app
```

Use o comando `!painel-web` para criar o painel com botões que redirecionam para o portal.

## Estrutura do Projeto

```
scc-tickets/
├── baseticket/           # Bot Discord original
├── prisma/
│   ├── schema.prisma     # Schema do banco
│   └── seed.js           # Seed inicial
├── public/
│   └── uploads/          # Uploads locais
├── src/
│   ├── app/
│   │   ├── api/          # API Routes
│   │   │   ├── admin/    # APIs do painel admin
│   │   │   ├── auth/     # NextAuth
│   │   │   ├── tickets/  # APIs de tickets
│   │   │   └── upload/   # Upload de arquivos
│   │   ├── admin/        # Páginas do painel admin
│   │   ├── login/        # Página de login
│   │   ├── tickets/      # Páginas de tickets do usuário
│   │   └── page.tsx      # Home
│   ├── components/       # Componentes React
│   └── lib/              # Utilitários e configurações
├── package.json
├── tailwind.config.ts
└── vercel.json
```

## Permissões por Cargo

| Cargo | Categorias |
|-------|------------|
| Suporte | Suporte, Bugs, Boost, Casas |
| Moderador | Suporte, Bugs, Boost, Casas |
| Coordenador | Suporte, Bugs, Boost, Casas, Denúncias, Revisão |
| Community Manager | Suporte, Bugs, Boost, Casas, Denúncias, Revisão |
| CEO | Todas as categorias (incluindo Doações - exclusivo) |

## Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento do StreetCarClub.

---

**StreetCarClub** &copy; 2024 - Todos os direitos reservados
