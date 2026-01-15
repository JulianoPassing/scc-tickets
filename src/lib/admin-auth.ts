import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'default-secret-key')

export interface AdminToken {
  staffId: string
  username: string
  role: string
  name: string
}

export async function signAdminToken(payload: AdminToken): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
  
  return token
}

export async function verifyAdminToken(token: string): Promise<AdminToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as AdminToken
  } catch {
    return null
  }
}

export async function authenticateAdmin(username: string, password: string) {
  const staff = await prisma.staff.findUnique({
    where: { username, active: true },
  })

  if (!staff) {
    return null
  }

  const isValid = await bcrypt.compare(password, staff.password)
  if (!isValid) {
    return null
  }

  return staff
}

export async function getAdminSession(): Promise<AdminToken | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token) {
    return null
  }

  return verifyAdminToken(token)
}

// Permissões por cargo
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPORTE: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  MODERADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS'],
  COORDENADOR: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  COMMUNITY_MANAGER: ['SUPORTE', 'BUGS', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
  CEO: ['SUPORTE', 'BUGS', 'DOACOES', 'BOOST', 'CASAS', 'DENUNCIAS', 'REVISAO'],
}

export function canAccessCategory(role: string, category: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(category)
}
