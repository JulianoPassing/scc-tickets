import { NextRequest, NextResponse } from 'next/server'
import { verifyKey } from 'discord-interactions'

// Handler para interações do Discord (comandos slash)
export async function POST(request: NextRequest) {
  try {
    // Validar assinatura do Discord
    const signature = request.headers.get('x-signature-ed25519')
    const timestamp = request.headers.get('x-signature-timestamp')
    
    if (!signature || !timestamp) {
      console.error('Headers de assinatura ausentes')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    const body = await request.text()
    const publicKey = process.env.DISCORD_PUBLIC_KEY
    
    if (!publicKey) {
      console.error('DISCORD_PUBLIC_KEY não configurado')
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

    // Verificar assinatura (para PING do Discord, a validação é obrigatória)
    try {
      const isValid = verifyKey(body, signature, timestamp, publicKey)
      
      if (!isValid) {
        console.error('Assinatura Discord inválida')
        console.error('Body length:', body.length)
        console.error('Signature:', signature?.substring(0, 20) + '...')
        console.error('Timestamp:', timestamp)
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
    } catch (verifyError) {
      console.error('Erro ao verificar assinatura:', verifyError)
      return NextResponse.json({ error: 'Erro na verificação' }, { status: 401 })
    }

    const interaction = JSON.parse(body)
    console.log('Interação recebida tipo:', interaction.type)

    // Verificar se é um comando
    if (interaction.type === 2) { // APPLICATION_COMMAND
      const commandName = interaction.data?.name

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
    if (interaction.type === 1) {
      return NextResponse.json({ type: 1 })
    }

    return NextResponse.json({ error: 'Comando não reconhecido' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar interação Discord:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
