import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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

    // Validar tipo de arquivo (apenas imagens para imgur)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Apenas imagens são aceitas.' },
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

    // Converter arquivo para base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Upload para Imgur (API anônima)
    const imgurResponse = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Client-ID ' + (process.env.IMGUR_CLIENT_ID || 'c8c5a7ad2b97dd6'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
        type: 'base64',
        name: file.name,
      }),
    })

    if (!imgurResponse.ok) {
      const errorData = await imgurResponse.json().catch(() => ({}))
      console.error('Erro no Imgur:', errorData)
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      )
    }

    const imgurData = await imgurResponse.json()
    const url = imgurData.data?.link

    if (!url) {
      return NextResponse.json(
        { error: 'Erro ao obter URL da imagem' },
        { status: 500 }
      )
    }

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
