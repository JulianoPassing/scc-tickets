import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'StreetCarClub - Sistema de Tickets',
  description: 'Central de Atendimento StreetCarClub',
  icons: {
    icon: 'https://i.imgur.com/YULctuK.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
