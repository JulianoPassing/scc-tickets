# Integração do Sistema de Tickets na VPS

## 📋 Análise da Situação Atual

### Sistema Existente (jp.sistemas)
- **Stack**: Node.js + Express
- **Banco**: MariaDB/MySQL (mysql2)
- **Autenticação**: JWT + Express Session
- **Arquitetura**: Multi-tenancy (cada usuário tem seu banco)
- **Frontend**: HTML/CSS/JS puro
- **Porta**: 3000

### Sistema de Tickets (scc-tickets)
- **Stack**: Next.js 14 (App Router)
- **Banco**: PostgreSQL (Prisma) - Neon
- **Autenticação**: NextAuth.js (Discord OAuth) + JWT (Admin)
- **Frontend**: React + Tailwind CSS
- **Deploy**: Vercel

## ✅ É POSSÍVEL INTEGRAR!

## 🎯 Opções de Integração

### **Opção 1: Next.js Standalone na VPS (RECOMENDADO)**

**Vantagens:**
- ✅ Mantém toda funcionalidade do Next.js
- ✅ Não precisa reescrever código
- ✅ Fácil manutenção
- ✅ Pode rodar em porta separada ou subdiretório

**Como funciona:**
1. Build do Next.js como standalone
2. Rodar em porta separada (ex: 3001) ou subdiretório
3. Configurar proxy reverso no Nginx/Apache ou no Express

**Passos:**
```bash
# 1. No projeto scc-tickets, configurar para standalone
# next.config.js já deve ter output: 'standalone'

# 2. Build
npm run build

# 3. Copiar para VPS
# - .next/standalone
# - .next/static
# - public/

# 4. Rodar na VPS
cd .next/standalone
PORT=3001 node server.js
```

**Configuração no Express (proxy reverso):**
```javascript
// No server.js do jp.sistemas
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/tickets', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/tickets': '', // Remove /tickets do path
  },
}));
```

---

### **Opção 2: Adaptar para MySQL e Integrar no Express**

**Vantagens:**
- ✅ Tudo em um único servidor
- ✅ Compartilha autenticação
- ✅ Banco de dados unificado

**Desvantagens:**
- ⚠️ Precisa adaptar Prisma para MySQL
- ⚠️ Precisa reescrever algumas partes
- ⚠️ Mais trabalho de integração

**Passos:**
1. Adaptar `prisma/schema.prisma` para MySQL
2. Criar banco `scc_tickets` no MariaDB
3. Migrar autenticação para usar JWT do sistema existente
4. Criar rotas API no Express ou manter Next.js API routes

---

### **Opção 3: Next.js como Subdiretório no Nginx**

**Vantagens:**
- ✅ URLs limpas (ex: `dominio.com/tickets`)
- ✅ SSL automático
- ✅ Melhor performance

**Como funciona:**
```
Nginx → / → Express (jp.sistemas) :3000
      → /tickets → Next.js :3001
```

**Configuração Nginx:**
```nginx
location /tickets {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 🔧 Adaptação do Banco de Dados

### Migrar de PostgreSQL (Neon) para MariaDB/MySQL

**1. Atualizar `prisma/schema.prisma`:**

```prisma
datasource db {
  provider = "mysql"  // Mudar de "postgresql" para "mysql"
  url      = env("DATABASE_URL")
}
```

**2. Ajustar tipos de dados:**
- `@db.Text` → `TEXT` (já funciona)
- `@db.VarChar(255)` → `VARCHAR(255)` (já funciona)
- Enums → `ENUM` (já funciona no MySQL 8+)
- `@default(autoincrement())` → `AUTO_INCREMENT` (já funciona)

**3. Connection String:**
```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/scc_tickets"
```

**4. Criar banco:**
```sql
CREATE DATABASE scc_tickets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**5. Executar migrations:**
```bash
npx prisma migrate dev
# ou
npx prisma db push
```

---

## 🔐 Integração de Autenticação

### Opção A: Manter NextAuth.js (Discord OAuth)
- ✅ Funciona independente
- ✅ Não interfere no sistema existente
- ⚠️ Duas autenticações diferentes

### Opção B: Usar JWT do sistema existente
- ✅ Autenticação unificada
- ⚠️ Precisa adaptar código
- ⚠️ Discord OAuth precisa ser integrado no Express

**Exemplo de adaptação:**
```javascript
// Criar middleware para Next.js usar JWT do Express
// middleware.ts
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request) {
  const token = request.cookies.get('token')?.value
  
  if (!token) {
    return NextResponse.redirect('/login')
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Adicionar user ao request
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user', JSON.stringify(decoded))
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    return NextResponse.redirect('/login')
  }
}
```

---

## 📦 Estrutura de Deploy Recomendada

```
VPS
├── /var/www/jp-sistemas/          # Sistema principal
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── /var/www/scc-tickets/           # Sistema de tickets
│   ├── .next/
│   ├── public/
│   ├── package.json
│   └── ...
│
└── /etc/nginx/sites-available/
    └── default                     # Configuração Nginx
```

---

## 🚀 Passos para Implementação (Opção 1 - Recomendada)

### 1. Preparar Next.js para Standalone

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone', // Já deve estar configurado
  // ...
}
```

### 2. Adaptar Prisma para MySQL

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 3. Atualizar .env

```env
# Banco de dados
DATABASE_URL="mysql://jpsistemas:senha@localhost:3306/scc_tickets"

# NextAuth
NEXTAUTH_URL="https://seu-dominio.com/tickets"
NEXTAUTH_SECRET="seu-secret-aqui"

# Discord OAuth
DISCORD_CLIENT_ID="seu-client-id"
DISCORD_CLIENT_SECRET="seu-client-secret"

# App URL
NEXT_PUBLIC_APP_URL="https://seu-dominio.com/tickets"
```

### 4. Build e Deploy

```bash
# No projeto scc-tickets
npm run build

# Copiar para VPS
scp -r .next/standalone user@vps:/var/www/scc-tickets/
scp -r .next/static user@vps:/var/www/scc-tickets/.next/
scp -r public user@vps:/var/www/scc-tickets/

# Na VPS
cd /var/www/scc-tickets/.next/standalone
npm install --production
PORT=3001 node server.js
```

### 5. Configurar PM2 (Process Manager)

```bash
# pm2.config.js
module.exports = {
  apps: [
    {
      name: 'jp-sistemas',
      script: './server.js',
      cwd: '/var/www/jp-sistemas',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'scc-tickets',
      script: './server.js',
      cwd: '/var/www/scc-tickets/.next/standalone',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    }
  ]
}
```

```bash
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### 6. Configurar Nginx

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Sistema principal
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Sistema de tickets
    location /tickets {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Comparação das Opções

| Aspecto | Opção 1 (Standalone) | Opção 2 (Integrado) | Opção 3 (Nginx) |
|---------|---------------------|---------------------|----------------|
| **Complexidade** | ⭐⭐ Média | ⭐⭐⭐ Alta | ⭐⭐ Média |
| **Manutenção** | ⭐⭐⭐ Fácil | ⭐⭐ Média | ⭐⭐⭐ Fácil |
| **Performance** | ⭐⭐⭐ Boa | ⭐⭐⭐ Boa | ⭐⭐⭐⭐ Excelente |
| **Tempo** | 2-3 horas | 1-2 dias | 3-4 horas |
| **Recomendado** | ✅ Sim | ❌ Não | ✅ Sim (se tiver Nginx) |

---

## 🎯 Recomendação Final

**Use a Opção 1 ou 3:**
- ✅ Menos trabalho
- ✅ Mantém código original
- ✅ Fácil de atualizar
- ✅ Isolamento entre sistemas

**Próximos passos:**
1. Decidir qual opção usar
2. Adaptar Prisma para MySQL
3. Configurar banco de dados
4. Fazer build e deploy
5. Configurar proxy/Nginx

---

## ❓ Dúvidas Frequentes

**P: Preciso mudar o código do Next.js?**
R: Mínimo - apenas adaptar Prisma para MySQL e connection string.

**P: Posso usar o mesmo banco do jp.sistemas?**
R: Sim, mas recomendo banco separado (`scc_tickets`) para isolamento.

**P: E o Discord bot?**
R: Continua funcionando normalmente, só precisa atualizar a URL no comando.

**P: E se eu quiser autenticação unificada?**
R: É possível, mas requer mais trabalho. Recomendo manter separado inicialmente.
