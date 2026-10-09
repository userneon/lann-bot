const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('./config');
const categories = require('./categories');

// The ticket owner's ID and category are stored in the channel topic so tickets survive
// bot restarts without needing a database.
const TOPIC_PATTERN = /^ticket-owner:(\d+):(\w+)/;
const COLOR = 0x5865f2;

// Tickets currently being created, to stop double-submits making two channels.
const opening = new Set();
// Channels currently being closed, so two close clicks don't post two transcripts.
const closing = new Set();

function getCategory(key) {
  return categories.find((c) => c.key === key);
}

function parseTopic(channel) {
  if (!channel || channel.parentId !== config.categoryId) return null;
  const match = channel.topic?.match(TOPIC_PATTERN);
  return match ? { ownerId: match[1], categoryKey: match[2] } : null;
}

function getTicketOwnerId(channel) {
  return parseTopic(channel)?.ownerId ?? null;
}

function isStaff(member) {
  return (
    member.roles.cache.has(config.supportRoleId) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  );
}

function panelMessage() {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🛡️ Манай серверийн албан ёсны тусламжийн сувагт тавтай морилно уу')
    .setDescription(
      [
        '```',
        '╔════════════════════════════╗',
        '         LANN GAMING',
        '        TICKET SYSTEM',
        '╚════════════════════════════╝',
        '```',
        'Та доорх цэснээс өөрийн асуудалд тохирох ticket-ийг сонгон нээж, манай админ багтай холбогдоно уу.',
      ].join('\n'),
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:select')
    .setPlaceholder('Ticket-ийн төрлөө сонгоно уу')
    .addOptions(
      categories.map((c) => ({
        label: c.label,
        description: c.description,
        emoji: c.emoji,
        value: c.key,
      })),
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

// The ephemeral message a member gets after picking a ticket type, with a button that opens the form.
function categoryPrompt(category) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${category.emoji} ${category.label}`)
    .setDescription(category.description);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:form:${category.key}`)
      .setLabel('Анкет бөглөх')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

function ticketModal(category) {
  return new ModalBuilder()
    .setCustomId(`ticket:submit:${category.key}`)
    .setTitle(category.formTitle ?? category.label)
    .addComponents(
      category.questions.map((q) => {
        const input = new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label)
          .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setMaxLength(1000)
          .setRequired(true);
        if (q.placeholder) input.setPlaceholder(q.placeholder);
        return new ActionRowBuilder().addComponents(input);
      }),
    );
}

function findOpenTicket(guild, userId, categoryKey) {
  return guild.channels.cache.find((c) => {
    const t = parseTopic(c);
    return t?.ownerId === userId && t.categoryKey === categoryKey;
  });
}

function ticketControls({ claimedBy } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel(claimedBy ? `${claimedBy} хариуцаж байна` : 'Хариуцах')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Хаах')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
}

// `answers` is a list of { label, value } from the category's form.
async function openTicket(interaction, category, answers) {
  const { guild, user } = interaction;

  // Members can have one open ticket per category.
  const existing = findOpenTicket(guild, user.id, category.key);
  if (existing) {
    return interaction.editReply(`Танд энэ төрлийн нээлттэй ticket байна: ${existing}`);
  }
  const lockKey = `${user.id}:${category.key}`;
  if (opening.has(lockKey)) {
    return interaction.editReply('Таны ticket үүсгэгдэж байна.');
  }

  opening.add(lockKey);
  try {
    const username = user.username.toLowerCase().replace(/[^a-z0-9-]/g, '') || user.id;
    const channel = await guild.channels.create({
      name: `${category.key}-${username}`.slice(0, 90),
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `ticket-owner:${user.id}:${category.key} | ${category.label}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: config.supportRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
          ],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${category.emoji} ${category.label}`)
      .setDescription(`Сайн байна уу ${user}, манай админ баг удахгүй тантай холбогдох болно.`)
      .addFields(answers.map((a) => ({ name: a.label, value: a.value })))
      .setTimestamp();

    await channel.send({
      content: `${user} <@&${config.supportRoleId}>`,
      embeds: [embed],
      components: [ticketControls()],
      allowedMentions: { users: [user.id], roles: [config.supportRoleId] },
    });

    return interaction.editReply(`Таны ticket үүслээ: ${channel}`);
  } finally {
    opening.delete(lockKey);
  }
}

async function buildTranscript(channel) {
  const messages = [];
  let before;
  while (messages.length < 5000) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;
    messages.push(...batch.values());
    before = batch.last().id;
  }
  messages.reverse();

  const lines = messages.map((m) => {
    const time = m.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    const parts = [m.content];
    for (const e of m.embeds) {
      const fields = e.fields.map((f) => `${f.name}: ${f.value}`);
      parts.push(`[embed] ${[e.title, e.description, ...fields].filter(Boolean).join(' | ')}`);
    }
    for (const a of m.attachments.values()) parts.push(`[attachment] ${a.url}`);
    return `[${time} UTC] ${m.author.tag}: ${parts.filter(Boolean).join(' ')}`;
  });

  const header = `Transcript of #${channel.name}\nTopic: ${channel.topic ?? ''}\n\n`;
  return new AttachmentBuilder(Buffer.from(header + lines.join('\n'), 'utf8'), {
    name: `${channel.name}-transcript.txt`,
  });
}

async function closeTicket(channel, closedBy, reason = 'Шалтгаан заагаагүй') {
  if (closing.has(channel.id)) return;
  closing.add(channel.id);

  const ticket = parseTopic(channel);
  const category = ticket && getCategory(ticket.categoryKey);
  await channel.send(`🔒 ${closedBy} ticket-ийг хаалаа. Энэ суваг 5 секундын дараа устгагдана.`);

  const transcript = await buildTranscript(channel);
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('Ticket хаагдлаа')
    .addFields(
      { name: 'Ticket', value: channel.name, inline: true },
      { name: 'Төрөл', value: category?.label ?? '-', inline: true },
      { name: 'Нээсэн', value: ticket ? `<@${ticket.ownerId}>` : '-', inline: true },
      { name: 'Хаасан', value: `${closedBy}`, inline: true },
      { name: 'Шалтгаан', value: reason },
    )
    .setTimestamp();

  if (config.logChannelId) {
    const logChannel = await channel.guild.channels.fetch(config.logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed], files: [transcript] }).catch(console.error);
    }
  }

  if (ticket) {
    const owner = await channel.client.users.fetch(ticket.ownerId).catch(() => null);
    // DMs fail if the user has them disabled; that's fine.
    await owner?.send({ embeds: [embed], files: [transcript] }).catch(() => {});
  }

  setTimeout(() => {
    channel
      .delete(`Ticket closed by ${closedBy.tag}`)
      .catch(console.error)
      .finally(() => closing.delete(channel.id));
  }, 5000);
}

module.exports = {
  getCategory,
  getTicketOwnerId,
  isStaff,
  findOpenTicket,
  panelMessage,
  categoryPrompt,
  ticketModal,
  ticketControls,
  openTicket,
  closeTicket,
};
