import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Re-exportar permissões para manter compatibilidade com imports existentes nas API routes
export { ROLE_PERMISSIONS, canAccessCategory } from './permissions'

const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'default-secret-key')

export interface AdminToken {
  staffId: string
  username: string
  role: string
  name: string
  discordId?: string
  avatar?: string
  [key: string]: string | undefined  // Index signature para compatibilidade com JWTPayload
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

export async function getAdminSession(): Promise<AdminToken | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token) {
    return null
  }

  return verifyAdminToken(token)
}
