'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CATEGORIES, getCategoryInfo } from '@/lib/categories'

export default function NewTicketPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  const [category, setCategory] = useState(categoryParam || '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/tickets/new?category=${categoryParam}`)
    }
  }, [status, router, categoryParam])

  useEffect(() => {
    if (categoryParam) {
      setCategory(categoryParam)
    }
  }, [categoryParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar ticket')
      }

      router.push(`/tickets/${data.ticket.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = getCategoryInfo(category as any)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/tickets" className="text-gray-400 hover:text-primary transition-colors">
              &larr; Voltar para Meus Tickets
            </Link>
          </div>

          <div className="card">
            <h1 className="text-2xl font-bold mb-2">Abrir Novo Ticket</h1>
            <p className="text-gray-400 mb-8">
              Preencha as informações abaixo para abrir um novo ticket de suporte.
            </p>

            {/* Info do usuário */}
            <div className="flex items-center gap-4 p-4 bg-background rounded-lg mb-6">
              {session.user?.avatar && (
                <Image
                  src={session.user.avatar}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">{session.user?.name}</p>
                <p className="text-sm text-gray-400">Discord ID: {session.user?.discordId}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Categoria */}
              <div>
                <label className="label">Categoria</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        category === cat.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-gray-500'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.emoji}</span>
                      <span className="font-medium text-sm">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label htmlFor="subject" className="label">
                  Assunto
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input"
                  placeholder="Resumo do seu problema ou solicitação"
                  maxLength={100}
                  required
                />
              </div>

              {/* Mensagem */}
              <div>
                <label htmlFor="message" className="label">
                  Descreva seu problema
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="textarea"
                  rows={6}
                  placeholder="Forneça o máximo de detalhes possível para agilizar seu atendimento..."
                  required
                />
              </div>

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || !category || !subject || !message}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-background"></span>
                      Criando...
                    </span>
                  ) : (
                    'Criar Ticket'
                  )}
                </button>
                <Link href="/tickets" className="btn-secondary">
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
