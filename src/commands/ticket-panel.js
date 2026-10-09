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
    .setDescription('Post the "Open Ticket" panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Where to post the panel (defaults to this channel)')
        .addChannelTypes(ChannelType.GuildText),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    await channel.send(panelMessage());
    await interaction.reply({ content: `Ticket panel posted in ${channel}.`, flags: MessageFlags.Ephemeral });
  },
};
