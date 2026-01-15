'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://i.imgur.com/YULctuK.png"
              alt="SCC Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-xl font-bold text-primary">StreetCarClub</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-primary transition-colors">
              Início
            </Link>
            {session && (
              <Link href="/tickets" className="text-gray-300 hover:text-primary transition-colors">
                Meus Tickets
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {session.user?.avatar && (
                    <Image
                      src={session.user.avatar}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-300">{session.user?.name}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm py-2 px-4">
                Entrar com Discord
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
