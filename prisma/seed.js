// Seed para criar staffs iniciais
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar staffs
  const staffs = [
    {
      username: 'CEO',
      password: await bcrypt.hash('CEO', 10),
      name: 'CEO',
      role: 'CEO',
    },
    {
      username: 'Community',
      password: await bcrypt.hash('Community', 10),
      name: 'Community Manager',
      role: 'COMMUNITY_MANAGER',
    },
    {
      username: 'Coordenador',
      password: await bcrypt.hash('Coordenador', 10),
      name: 'Coordenador',
      role: 'COORDENADOR',
    },
    {
      username: 'Moderador',
      password: await bcrypt.hash('Moderador', 10),
      name: 'Moderador',
      role: 'MODERADOR',
    },
    {
      username: 'Suporte',
      password: await bcrypt.hash('Suporte', 10),
      name: 'Suporte',
      role: 'SUPORTE',
    },
  ]

  for (const staff of staffs) {
    const existing = await prisma.staff.findUnique({
      where: { username: staff.username }
    })
    
    if (!existing) {
      await prisma.staff.create({ data: staff })
      console.log(`✅ Staff criado: ${staff.username} (${staff.role})`)
    } else {
      console.log(`⏭️ Staff já existe: ${staff.username}`)
    }
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
