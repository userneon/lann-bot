const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('./config');

// The ticket owner's ID is stored in the channel topic so tickets survive bot restarts
// without needing a database.
const TOPIC_PREFIX = 'ticket-owner:';
const COLOR = 0x5865f2;

// Users whose ticket is currently being created, to stop double-clicks making two channels.
const opening = new Set();
// Channels currently being closed, so two close clicks don't post two transcripts.
const closing = new Set();

function getTicketOwnerId(channel) {
  if (!channel || channel.parentId !== config.categoryId) return null;
  const match = channel.topic?.match(/^ticket-owner:(\d+)/);
  return match ? match[1] : null;
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
    .setTitle('Need help?')
    .setDescription('Click the button below to open a private ticket with our support team.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:open')
      .setLabel('Open Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

function ticketControls({ claimedBy } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel(claimedBy ? `Claimed by ${claimedBy}` : 'Claim')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
}

async function openTicket(interaction, reason) {
  const { guild, user } = interaction;

  const existing = guild.channels.cache.find((c) => getTicketOwnerId(c) === user.id);
  if (existing) {
    return interaction.editReply(`You already have an open ticket: ${existing}`);
  }
  if (opening.has(user.id)) {
    return interaction.editReply('Your ticket is already being created.');
  }

  opening.add(user.id);
  try {
    const name = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `${TOPIC_PREFIX}${user.id} | ${reason}`.slice(0, 1024),
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
      .setTitle('Ticket opened')
      .setDescription(
        `Thanks ${user}, a member of the support team will be with you shortly.\n` +
          'Please describe your issue in as much detail as you can.',
      )
      .addFields({ name: 'Reason', value: reason })
      .setTimestamp();

    await channel.send({
      content: `${user} <@&${config.supportRoleId}>`,
      embeds: [embed],
      components: [ticketControls()],
      allowedMentions: { users: [user.id], roles: [config.supportRoleId] },
    });

    return interaction.editReply(`Your ticket has been created: ${channel}`);
  } finally {
    opening.delete(user.id);
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
    for (const e of m.embeds) parts.push(`[embed] ${[e.title, e.description].filter(Boolean).join(' - ')}`);
    for (const a of m.attachments.values()) parts.push(`[attachment] ${a.url}`);
    return `[${time} UTC] ${m.author.tag}: ${parts.filter(Boolean).join(' ')}`;
  });

  const header = `Transcript of #${channel.name}\nTopic: ${channel.topic ?? ''}\n\n`;
  return new AttachmentBuilder(Buffer.from(header + lines.join('\n'), 'utf8'), {
    name: `${channel.name}-transcript.txt`,
  });
}

async function closeTicket(channel, closedBy, reason = 'No reason given') {
  if (closing.has(channel.id)) return;
  closing.add(channel.id);

  const ownerId = getTicketOwnerId(channel);
  await channel.send(`🔒 Ticket closed by ${closedBy}. This channel will be deleted in 5 seconds.`);

  const transcript = await buildTranscript(channel);
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('Ticket closed')
    .addFields(
      { name: 'Ticket', value: channel.name, inline: true },
      { name: 'Opened by', value: ownerId ? `<@${ownerId}>` : 'Unknown', inline: true },
      { name: 'Closed by', value: `${closedBy}`, inline: true },
      { name: 'Reason', value: reason },
    )
    .setTimestamp();

  if (config.logChannelId) {
    const logChannel = await channel.guild.channels.fetch(config.logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed], files: [transcript] }).catch(console.error);
    }
  }

  if (ownerId) {
    const owner = await channel.client.users.fetch(ownerId).catch(() => null);
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
  getTicketOwnerId,
  isStaff,
  panelMessage,
  ticketControls,
  openTicket,
  closeTicket,
};
