import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores principais
        primary: {
          DEFAULT: '#EAF207',
          hover: '#F4F740',
          active: '#C6C403',
          disabled: '#888A3A',
          '50': '#EAF20780',  // 50% transparência
          '20': '#EAF20733',  // 20% transparência
        },
        background: '#0D0D0D',
        card: '#1A1A1A',
        border: '#30363D',
        
        // Texto
        text: {
          primary: '#FFFFFF',
          secondary: '#B0B0B0',
        },
        
        // Cores das categorias
        cat: {
          suporte: '#6366F1',      // Indigo
          bugs: '#22C55E',         // Verde
          denuncias: '#EF4444',    // Vermelho
          doacoes: '#A855F7',      // Roxo
          boost: '#EC4899',        // Pink
          casas: '#F59E0B',        // Amber
          revisao: '#06B6D4',      // Cyan
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
