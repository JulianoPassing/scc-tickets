import { NextRequest, NextResponse } from 'next/server'
import { verifyKey } from 'discord-interactions'

// Forçar uso do runtime Node.js (não Edge) para garantir compatibilidade
export const runtime = 'nodejs'
export const maxDuration = 10

// Handler para interações do Discord (comandos slash)
export async function GET(request: NextRequest) {
  // Resposta para validação do endpoint pelo Discord
  console.log('📥 GET request recebido em /api/discord/interactions')
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  return NextResponse.json(
    { message: 'Discord Interactions Endpoint' },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[DISCORD] 📥 POST request recebido em /api/discord/interactions')
  console.log('[DISCORD] URL:', request.url)
  console.log('[DISCORD] Method:', request.method)
  
  try {
    // Validar assinatura do Discord
    const signature = request.headers.get('x-signature-ed25519')
    const timestamp = request.headers.get('x-signature-timestamp')
    
    if (!signature || !timestamp) {
      console.error('[DISCORD] ❌ Headers de assinatura ausentes')
      console.error('[DISCORD] Headers recebidos:', Object.fromEntries(request.headers.entries()))
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    console.log('✅ Headers de assinatura presentes')
    console.log('Signature:', signature?.substring(0, 20) + '...')
    console.log('Timestamp:', timestamp)
    
    // IMPORTANTE: Ler o body como texto bruto, sem parsing
    // Tratamento especial para evitar problemas com Edge Runtime
    let bodyText: string
    try {
      const bodyBuffer = await request.arrayBuffer()
      bodyText = Buffer.from(bodyBuffer).toString('utf-8')
    } catch (bodyError) {
      // Fallback para request.text() se arrayBuffer não funcionar
      bodyText = await request.text()
    }
    
    // Verificar se o body está corrompido (bug conhecido do Discord)
    if (bodyText.includes('[object') || bodyText.trim().length === 0) {
      console.error('[DISCORD] ❌ Body corrompido ou vazio:', bodyText.substring(0, 100))
      // Tentar responder ao PING mesmo assim (pode ser apenas verificação do Discord)
      return NextResponse.json({ type: 1 }, { status: 200 })
    }
    
    console.log('📦 Body recebido, tamanho:', bodyText.length)
    console.log('Body preview:', bodyText.substring(0, 100))
    const body = bodyText
    
    let publicKey = process.env.DISCORD_PUBLIC_KEY?.trim()
    
    if (!publicKey) {
      console.error('DISCORD_PUBLIC_KEY não configurado')
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }
    
    console.log('🔑 Public Key configurada, tamanho:', publicKey.length)

    // Verificar assinatura (para PING do Discord, a validação é obrigatória)
    try {
      console.log('[DISCORD] 🔐 Verificando assinatura...')
      const isValid = verifyKey(body, signature, timestamp, publicKey)
      
      if (!isValid) {
        console.error('[DISCORD] ❌ Assinatura Discord inválida')
        console.error('[DISCORD] Body length:', body.length)
        console.error('[DISCORD] Signature:', signature?.substring(0, 20) + '...')
        console.error('[DISCORD] Timestamp:', timestamp)
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
      console.log('[DISCORD] ✅ Assinatura válida!')
    } catch (verifyError: any) {
      console.error('[DISCORD] ❌ Erro ao verificar assinatura:', verifyError)
      console.error('[DISCORD] Erro stack:', verifyError?.stack)
      return NextResponse.json({ error: 'Erro na verificação' }, { status: 401 })
    }

    console.log('[DISCORD] 📝 Fazendo parse do JSON...')
    let interaction
    try {
      interaction = JSON.parse(body)
      console.log('[DISCORD] ✅ JSON parseado com sucesso')
    } catch (parseError: any) {
      console.error('[DISCORD] ❌ Erro ao fazer parse do JSON:', parseError)
      console.error('[DISCORD] Body:', body)
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    
    console.log('[DISCORD] Interação recebida tipo:', interaction.type)
    
    // PING do Discord (resposta imediata para validação do endpoint)
    if (interaction.type === 1) {
      console.log('[DISCORD] ✅ Respondendo PING do Discord')
      // Resposta mínima e rápida para PING
      const pingResponse = new NextResponse(
        JSON.stringify({ type: 1 }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      )
      console.log('[DISCORD] ✅ PING respondido em', Date.now() - startTime, 'ms')
      return pingResponse
    }
    
    console.log('Command name:', interaction.data?.name)

    // Verificar se é um comando
    if (interaction.type === 2) { // APPLICATION_COMMAND
      const commandName = interaction.data?.name
      console.log('Processando comando:', commandName)

      if (commandName === 'sistema-ticket') {
        console.log('[DISCORD] ✅ Comando sistema-ticket reconhecido, enviando resposta')
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scc-tickets.vercel.app'
        
        const response = NextResponse.json({
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
        
        console.log('[DISCORD] ✅ Resposta enviada em', Date.now() - startTime, 'ms')
        return response
      }
    }

    // Comando não reconhecido
    console.warn('⚠️ Comando não reconhecido, tipo:', interaction.type)
    return NextResponse.json({ error: 'Comando não reconhecido' }, { status: 400 })
  } catch (error: any) {
    console.error('[DISCORD] ❌ Erro ao processar interação Discord:', error)
    console.error('[DISCORD] Stack:', error?.stack)
    console.error('[DISCORD] Mensagem:', error?.message)
    return NextResponse.json(
      { error: 'Erro interno', message: error?.message },
      { status: 500 }
    )
  }
}
