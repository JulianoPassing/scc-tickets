import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Upload de arquivos (para usuários e admins) - Usa ImgBB
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

    // Validar tipo de arquivo (apenas imagens)
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

    // Validar tamanho (max 32MB - limite do ImgBB)
    const maxSize = 32 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 32MB)' },
        { status: 400 }
      )
    }

    // Converter arquivo para base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Upload para ImgBB
    const imgbbKey = process.env.IMGBB_API_KEY
    if (!imgbbKey) {
      console.error('IMGBB_API_KEY não configurada')
      return NextResponse.json(
        { error: 'Serviço de upload não configurado' },
        { status: 500 }
      )
    }

    const imgbbFormData = new FormData()
    imgbbFormData.append('key', imgbbKey)
    imgbbFormData.append('image', base64)
    imgbbFormData.append('name', file.name.split('.')[0])

    const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData,
    })

    if (!imgbbResponse.ok) {
      const errorData = await imgbbResponse.json().catch(() => ({}))
      console.error('Erro no ImgBB:', errorData)
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      )
    }

    const imgbbData = await imgbbResponse.json()
    const url = imgbbData.data?.url || imgbbData.data?.display_url

    if (!url) {
      console.error('Resposta do ImgBB sem URL:', imgbbData)
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
