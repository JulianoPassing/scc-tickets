import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CATEGORIES } from '@/lib/categories'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-20 via-background to-background" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Image
              src="https://i.imgur.com/kHvmXj6.png"
              alt="StreetCarClub Banner"
              width={400}
              height={150}
              className="mx-auto mb-8"
              priority
            />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary">
              Central de <span className="text-primary">Atendimento</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Bem-vindo ao sistema de tickets do StreetCarClub. Selecione uma categoria
              abaixo para abrir um novo ticket ou acesse seus tickets existentes.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/tickets" className="btn-primary">
                Meus Tickets
              </Link>
              <Link href="#categorias" className="btn-secondary">
                Abrir Ticket
              </Link>
            </div>
          </div>
        </section>

        {/* Categorias */}
        <section id="categorias" className="py-16 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-4">
              Escolha uma <span className="text-primary">Categoria</span>
            </h2>
            <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
              Selecione a categoria que melhor se encaixa na sua necessidade. 
              Nossa equipe irá atendê-lo o mais breve possível.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/tickets/new?category=${category.id}`}
                  className={`card hover:${category.borderClass} transition-all duration-300 group`}
                  style={{ ['--cat-color' as string]: category.color }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {category.emoji}
                    </div>
                    <h3 
                      className="text-xl font-semibold transition-colors"
                      style={{ color: 'inherit' }}
                    >
                      {category.name}
                    </h3>
                  </div>
                  <p className="text-text-secondary text-sm">{category.description}</p>
                  <div
                    className="mt-4 h-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: category.color }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold mb-2 text-text-primary">Resposta Rápida</h3>
                <p className="text-text-secondary">
                  Nossa equipe responde em até 72h úteis. Tickets urgentes são priorizados.
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2 text-text-primary">Privacidade</h3>
                <p className="text-text-secondary">
                  Seus tickets são privados e apenas você e nossa equipe podem acessá-los.
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">📎</div>
                <h3 className="text-xl font-semibold mb-2 text-text-primary">Anexos</h3>
                <p className="text-text-secondary">
                  Envie imagens, vídeos e arquivos para explicar melhor sua situação.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
