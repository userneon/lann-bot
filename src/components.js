const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const {
  NOT_CONFIGURED,
  alreadyOpen,
  claimedEmbed,
  getCategory,
  findOpenTicket,
  getTicket,
  isStaff,
  panelMessage,
  categoryPrompt,
  ticketModal,
  ticketControls,
  openTicket,
  closeTicket,
} = require('./tickets');
const settings = require('./settings');

// Handlers for dropdowns, buttons and modals, keyed by the first two parts of the customId
// ("ticket:submit:unban" is handled by "ticket:submit" with arg "unban").
module.exports = {
  'ticket:select': async (interaction) => {
    const category = getCategory(interaction.values[0]);
    if (!category) return;
    const existing = findOpenTicket(interaction.guild, interaction.user.id, category.key);
    if (!settings.supportRoleIds.length) {
      await interaction.reply({ content: NOT_CONFIGURED, flags: MessageFlags.Ephemeral });
    } else if (existing) {
      await interaction.reply({ content: alreadyOpen(existing), flags: MessageFlags.Ephemeral });
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
      return interaction.reply({ content: '⛔ Зөвхөн админ баг ticket хариуцах боломжтой.', flags: MessageFlags.Ephemeral });
    }
    await interaction.update({ components: [ticketControls({ claimedBy: interaction.user.username })] });
    await interaction.followUp({ embeds: [claimedEmbed(interaction.user)] });
  },

  'ticket:close': async (interaction) => {
    const ticket = await getTicket(interaction.channel);
    if (!isStaff(interaction.member) && interaction.user.id !== ticket?.ownerId) {
      return interaction.reply({
        content: '⛔ Зөвхөн админ баг эсвэл ticket нээсэн хүн ticket-ийг хаах боломжтой.',
        flags: MessageFlags.Ephemeral,
      });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:close-confirm').setLabel('Тийм, хаах').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket:close-cancel').setLabel('Болих').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({
      content:
        '⚠️ **Та энэ ticket-ийг хаахдаа итгэлтэй байна уу?**\n' +
        'Хаасны дараа энэ thread устах бөгөөд бүх яриан бичлэгийн хуулбар ticket нээсэн хүнд DM-ээр очно. ' +
        'Энэ үйлдлийг буцаах боломжгүй.',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  'ticket:close-confirm': async (interaction) => {
    await interaction.update({ content: '🔒 Ticket хааж байна...', components: [] });
    await closeTicket(interaction.channel, interaction.user);
  },

  'ticket:close-cancel': async (interaction) => {
    await interaction.update({ content: '👍 Цуцаллаа. Ticket нээлттэй хэвээр байна.', components: [] });
  },
};
