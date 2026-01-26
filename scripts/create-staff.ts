import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criar staff inicial - ajuste conforme necessário
  const staffList = [
    {
      username: 'noel',
      password: 'admin123', // MUDE ESTA SENHA!
      name: 'Noel',
      role: 'COMMUNITY_MANAGER' as const,
    },
    // Adicione mais staff conforme necessário
  ]

  for (const staff of staffList) {
    const hashedPassword = await bcrypt.hash(staff.password, 10)
    
    const created = await prisma.staff.upsert({
      where: { username: staff.username },
      update: {},
      create: {
        username: staff.username,
        password: hashedPassword,
        name: staff.name,
        role: staff.role,
      },
    })
    
    console.log(`Staff criado: ${created.name} (${created.role})`)
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
