const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { panelMessage } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Ticket нээх цэсийг нийтлэх')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Цэсийг нийтлэх суваг (өгөхгүй бол энэ суваг)')
        .addChannelTypes(ChannelType.GuildText),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    await channel.send(panelMessage());
    await interaction.reply({ content: `Ticket цэсийг ${channel} сувагт нийтэллээ.`, flags: MessageFlags.Ephemeral });
  },
};
