const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const {
  getCategory,
  findOpenTicket,
  getTicketOwnerId,
  isStaff,
  panelMessage,
  categoryPrompt,
  ticketModal,
  ticketControls,
  openTicket,
  closeTicket,
} = require('./tickets');

// Handlers for dropdowns, buttons and modals, keyed by the first two parts of the customId
// ("ticket:submit:unban" is handled by "ticket:submit" with arg "unban").
module.exports = {
  'ticket:select': async (interaction) => {
    const category = getCategory(interaction.values[0]);
    if (!category) return;
    const existing = findOpenTicket(interaction.guild, interaction.user.id, category.key);
    if (existing) {
      await interaction.reply({
        content: `Танд энэ төрлийн нээлттэй ticket байна: ${existing}`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({ ...categoryPrompt(category), flags: MessageFlags.Ephemeral });
    }
    // Reset the dropdown, otherwise picking the same option again does nothing.
    await interaction.message.edit(panelMessage()).catch(() => {});
  },

  'ticket:form': async (interaction, key) => {
    const category = getCategory(key);
    if (!category) return;
    await interaction.showModal(ticketModal(category));
  },

  'ticket:submit': async (interaction, key) => {
    const category = getCategory(key);
    if (!category) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const answers = category.questions.map((q) => ({
      label: q.label,
      value: interaction.fields.getTextInputValue(q.id),
    }));
    await openTicket(interaction, category, answers);
  },

  'ticket:claim': async (interaction) => {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: 'Зөвхөн админ баг ticket хариуцах боломжтой.', flags: MessageFlags.Ephemeral });
    }
    await interaction.update({ components: [ticketControls({ claimedBy: interaction.user.username })] });
    await interaction.followUp(`🙋 ${interaction.user} энэ ticket-ийг хариуцаж авлаа.`);
  },

  'ticket:close': async (interaction) => {
    const ownerId = getTicketOwnerId(interaction.channel);
    if (!isStaff(interaction.member) && interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Зөвхөн админ эсвэл ticket нээсэн хүн хаах боломжтой.',
        flags: MessageFlags.Ephemeral,
      });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:close-confirm').setLabel('Тийм, хаах').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket:close-cancel').setLabel('Болих').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({
      content: 'Та энэ ticket-ийг хаахдаа итгэлтэй байна уу?',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  'ticket:close-confirm': async (interaction) => {
    await interaction.update({ content: 'Ticket хааж байна...', components: [] });
    await closeTicket(interaction.channel, interaction.user);
  },

  'ticket:close-cancel': async (interaction) => {
    await interaction.update({ content: 'Цуцаллаа.', components: [] });
  },
};
