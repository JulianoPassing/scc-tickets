export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
            <p className="text-sm text-gray-400">
              StreetCarClub &copy; {new Date().getFullYear()} - Todos os direitos reservados
            </p>
            <p className="text-xs text-gray-500">
              Desenvolvido por Noel🎅🏻
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://discord.gg/streetcarclub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              Discord
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              Termos
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
