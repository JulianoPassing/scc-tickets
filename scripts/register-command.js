// Script para registrar o comando slash no Discord
// Execute: node scripts/register-command.js

require('dotenv').config()

const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || '').replace(/^"|"$/g, '') // Remove aspas se existirem
const GUILD_ID = '1046404063287332936' // ID do servidor (opcional - para comando de servidor específico)

async function registerCommand() {
  if (!CLIENT_ID || !BOT_TOKEN) {
    console.error('Erro: DISCORD_CLIENT_ID e DISCORD_BOT_TOKEN devem estar configurados')
    process.exit(1)
  }

  const command = {
    name: 'sistema-ticket',
    description: 'Acesse o sistema de tickets do StreetCarClub',
    type: 1, // CHAT_INPUT
  }

  try {
    // Registrar comando globalmente (pode demorar até 1 hora para aparecer)
    const globalUrl = `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`
    
    const response = await fetch(globalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify(command),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Comando registrado globalmente!')
      console.log('Comando ID:', data.id)
      console.log('⚠️  Comandos globais podem demorar até 1 hora para aparecer em todos os servidores')
    } else {
      const error = await response.text()
      console.error('❌ Erro ao registrar comando global:', error)
    }

    // Registrar comando no servidor específico (aparece imediatamente)
    if (GUILD_ID) {
      const guildUrl = `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
      
      const guildResponse = await fetch(guildUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify(command),
      })

      if (guildResponse.ok) {
        const data = await guildResponse.json()
        console.log('✅ Comando registrado no servidor!')
        console.log('Comando ID:', data.id)
        console.log('✅ O comando /sistema-ticket já está disponível no servidor!')
      } else {
        const error = await guildResponse.text()
        console.error('❌ Erro ao registrar comando no servidor:', error)
      }
    }
  } catch (error) {
    console.error('Erro:', error)
  }
}

registerCommand()
