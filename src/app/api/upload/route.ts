import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Upload de arquivos (para usuários e admins)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (usuário OU admin)
    const userSession = await getServerSession(authOptions)
    const adminSession = await getAdminSession()

    if (!userSession?.user?.id && !adminSession) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const messageId = formData.get('messageId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'video/mp4',
      'video/webm',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      )
    }

    // Validar tamanho (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 10MB)' },
        { status: 400 }
      )
    }

    // Gerar nome único
    const ext = path.extname(file.name)
    const filename = `${uuidv4()}${ext}`

    // Salvar arquivo localmente (em produção, usar Cloudinary, S3, etc)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    const url = `/uploads/${filename}`

    // Se tiver messageId, salvar no banco
    if (messageId) {
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          url,
          mimeType: file.type,
          size: file.size,
          messageId,
        },
      })

      return NextResponse.json({ attachment })
    }

    return NextResponse.json({
      url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 })
  }
}
