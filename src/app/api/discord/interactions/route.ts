import { NextRequest, NextResponse } from 'next/server'

// Handler para interações do Discord (comandos slash)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar se é um comando
    if (body.type === 2) { // APPLICATION_COMMAND
      const commandName = body.data?.name

      if (commandName === 'sistema-ticket') {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scc-tickets.vercel.app'
        
        return NextResponse.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            embeds: [
              {
                title: '📄 Central de Atendimento - StreetCarClub',
                description: `**Bem-vindo à nossa Central de Atendimento!**

Abra um ticket no nosso sistema web para receber suporte personalizado da nossa equipe.

**❗ Importante:**
Evite marcar a equipe. Você será atendido o mais breve possível.

**📋 Categorias Disponíveis:**
• 🏠 **Casas** - Questões relacionadas a casas e propriedades
• 💎 **Doações** - Assuntos relacionados a doações
• 🐛 **Reportar Bugs** - Reportar erros e problemas técnicos
• ⚠️ **Denúncias** - Reportar infrações e problemas de conduta
• 🚀 **Boost** - Suporte para membros boosters
• 🔎 **Revisão** - Solicitar revisão de advertências e banimentos
• 📁 **Suporte** - Suporte técnico e ajuda geral

**🔗 Acesse o Sistema:**
[Clique aqui para abrir um ticket](${baseUrl}/tickets)

Ou acesse: ${baseUrl}/tickets

**💡 Como funciona:**
1. Acesse o link acima
2. Faça login com sua conta Discord
3. Selecione a categoria do seu ticket
4. Descreva seu problema ou solicitação
5. Nossa equipe responderá o mais rápido possível`,
                color: 0xEAF207, // Amarelo
                thumbnail: {
                  url: 'https://i.imgur.com/kHvmXj6.png',
                },
                footer: {
                  text: 'StreetCarClub • Atendimento de Qualidade',
                  icon_url: 'https://i.imgur.com/kHvmXj6.png',
                },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        })
      }
    }

    // PING do Discord
    if (body.type === 1) {
      return NextResponse.json({ type: 1 })
    }

    return NextResponse.json({ error: 'Comando não reconhecido' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar interação Discord:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
