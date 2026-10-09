const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getTicketOwnerId, isStaff, ticketControls, openTicket, closeTicket } = require('./tickets');

// Handlers for buttons and modals, keyed by customId.
module.exports = {
  'ticket:open': async (interaction) => {
    const modal = new ModalBuilder()
      .setCustomId('ticket:open-modal')
      .setTitle('Open a ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('What do you need help with?')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(500)
            .setRequired(true),
        ),
      );
    await interaction.showModal(modal);
  },

  'ticket:open-modal': async (interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const reason = interaction.fields.getTextInputValue('reason');
    await openTicket(interaction, reason);
  },

  'ticket:claim': async (interaction) => {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Only support staff can claim tickets.', flags: MessageFlags.Ephemeral });
    }
    await interaction.update({ components: [ticketControls({ claimedBy: interaction.user.username })] });
    await interaction.followUp(`🙋 ${interaction.user} has claimed this ticket.`);
  },

  'ticket:close': async (interaction) => {
    const ownerId = getTicketOwnerId(interaction.channel);
    if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
      return interaction.reply({ content: 'Only staff or the ticket owner can close this ticket.', flags: MessageFlags.Ephemeral });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:close-confirm').setLabel('Yes, close it').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket:close-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [row], flags: MessageFlags.Ephemeral });
  },

  'ticket:close-confirm': async (interaction) => {
    await interaction.update({ content: 'Closing ticket...', components: [] });
    await closeTicket(interaction.channel, interaction.user);
  },

  'ticket:close-cancel': async (interaction) => {
    await interaction.update({ content: 'Cancelled.', components: [] });
  },
};
