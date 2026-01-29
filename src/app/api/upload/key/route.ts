import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminSession } from '@/lib/admin-auth'

// Retorna a chave do ImgBB para upload direto do cliente
// Isso evita o limite de 4.5MB da Vercel
export async function GET() {
  try {
    // Verificar autenticação (usuário OU admin)
    const userSession = await getServerSession(authOptions)
    const adminSession = await getAdminSession()

    if (!userSession?.user?.id && !adminSession) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const imgbbKey = process.env.IMGBB_API_KEY
    if (!imgbbKey) {
      return NextResponse.json(
        { error: 'Serviço de upload não configurado' },
        { status: 500 }
      )
    }

    return NextResponse.json({ key: imgbbKey })
  } catch (error) {
    console.error('Erro ao obter chave:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
