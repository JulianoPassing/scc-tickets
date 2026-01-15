import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export const data = {
  name: 'sistema-ticket',
  description: 'Cria o painel de tickets que redireciona para o sistema web.'
};

// Cargo autorizado a usar o comando
const CARGO_AUTORIZADO = '1046404063673192546';

// URL do sistema de tickets
const WEB_URL = 'https://scc-tickets.vercel.app';

export async function execute(message, args, client) {
  // Verificar se o usuário tem o cargo autorizado
  if (!message.member.roles.cache.has(CARGO_AUTORIZADO)) {
    return message.reply({
      content: '❌ Você não tem permissão para usar este comando.',
      flags: 64
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#EAF207')
    .setTitle('📑 Central de Atendimento - StreetCarClub')
    .setDescription(
      '**Bem-vindo à nossa Central de Atendimento!**\n\n' +
      'Clique em uma das categorias abaixo para abrir um ticket. Você será redirecionado para nosso portal de atendimento.\n\n' +
      '> ❗ **Importante:** Você precisará fazer login com sua conta do Discord para abrir um ticket.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📁 **Suporte** • Suporte técnico e ajuda geral\n' +
      '🦠 **Reportar Bugs** • Reportar erros e problemas técnicos\n' +
      '⚠️ **Denúncias** • Reportar infrações e problemas de conduta\n' +
      '💎 **Doações** • Assuntos relacionados a doações\n' +
      '🚀 **Boost** • Suporte para membros boosters\n' +
      '🏠 **Casas** • Questões relacionadas a casas e propriedades\n' +
      '🔍 **Revisão** • Solicitar revisão de advertências e banimentos\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
    .setImage('https://i.imgur.com/kHvmXj6.png')
    .setFooter({ 
      text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved'
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📁 Suporte')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=SUPORTE`),
    new ButtonBuilder()
      .setLabel('🦠 Reportar Bugs')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=BUGS`),
    new ButtonBuilder()
      .setLabel('⚠️ Denúncias')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=DENUNCIAS`)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('💎 Doações')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=DOACOES`),
    new ButtonBuilder()
      .setLabel('🚀 Boost')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=BOOST`),
    new ButtonBuilder()
      .setLabel('🏠 Casas')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=CASAS`)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🔍 Revisão')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets/new?category=REVISAO`),
    new ButtonBuilder()
      .setLabel('📋 Meus Tickets')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_URL}/tickets`)
  );

  // Deletar a mensagem do comando
  try {
    await message.delete();
  } catch (e) {
    // Ignora se não conseguir deletar
  }

  // Enviar o painel
  await message.channel.send({ 
    embeds: [embed], 
    components: [row1, row2, row3] 
  });
}
