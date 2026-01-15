import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, signAdminToken } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const staff = await authenticateAdmin(username, password)

    if (!staff) {
      return NextResponse.json(
        { error: 'Usuário ou senha inválidos' },
        { status: 401 }
      )
    }

    const token = await signAdminToken({
      staffId: staff.id,
      username: staff.username,
      role: staff.role,
      name: staff.name,
    })

    const response = NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    })

    // Setar cookie httpOnly
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no login admin:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
