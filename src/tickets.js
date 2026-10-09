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
  ThreadAutoArchiveDuration,
} = require('discord.js');
const settings = require('./settings');
const categories = require('./categories');

// Tickets are private threads in the panel's channel. The owner's ID and the category are
// written in the footer of the bot's first message in the thread, so tickets survive bot
// restarts without needing a database. `tickets` caches them by thread ID.
const FOOTER_PATTERN = /^ticket:(\d+):(\w+)$/;
const COLOR = 0x5865f2;
const GREEN = 0x57f287;
const RED = 0xed4245;

const NOT_CONFIGURED =
  '⚙️ Ticket систем хараахан тохируулагдаагүй байна. Серверийн админ `/ticket-setup` командыг ажиллуулсны дараа ticket нээх боломжтой болно.';

function alreadyOpen(thread) {
  return `ℹ️ Танд энэ төрлийн ticket аль хэдийн нээлттэй байна: ${thread}\nШинэ ticket нээхийн оронд тэнд үргэлжлүүлэн бичнэ үү.`;
}

// Embed posted in the thread when a staff member claims it.
function claimedEmbed(staff) {
  return new EmbedBuilder()
    .setColor(GREEN)
    .setDescription(`🙋 ${staff} энэ ticket-ийг хариуцаж авлаа. Цаашид таны асуудлыг ${staff} шийдвэрлэнэ.`);
}
const tickets = new Map();

// Tickets currently being created, to stop double-submits making two threads.
const opening = new Set();
// Threads currently being closed, so two close clicks don't post two transcripts.
const closing = new Set();

function getCategory(key) {
  return categories.find((c) => c.key === key);
}

function isTicketThread(channel) {
  return (
    channel?.type === ChannelType.PrivateThread && channel.ownerId === channel.client.user.id
  );
}

// Returns { ownerId, categoryKey } if `channel` is a ticket thread, otherwise null.
async function getTicket(channel) {
  if (!isTicketThread(channel)) return null;
  if (tickets.has(channel.id)) return tickets.get(channel.id);

  // Not cached (e.g. after a restart): read it from the bot's first message in the thread.
  const messages = await channel.messages.fetch({ after: channel.id, limit: 10 }).catch(() => null);
  for (const m of messages?.values() ?? []) {
    const match = m.author.id === channel.client.user.id && m.embeds[0]?.footer?.text.match(FOOTER_PATTERN);
    if (match) {
      const ticket = { ownerId: match[1], categoryKey: match[2] };
      tickets.set(channel.id, ticket);
      return ticket;
    }
  }
  return null;
}

// Fills the cache with every open ticket so duplicate checks work after a restart.
async function loadOpenTickets(guild) {
  const { threads } = await guild.channels.fetchActiveThreads();
  await Promise.all(threads.map((thread) => getTicket(thread)));
  console.log(`Loaded ${tickets.size} open tickets.`);
}

function forgetTicket(threadId) {
  tickets.delete(threadId);
}

function findOpenTicket(guild, userId, categoryKey) {
  for (const [threadId, t] of tickets) {
    if (t.ownerId !== userId || t.categoryKey !== categoryKey) continue;
    const thread = guild.channels.cache.get(threadId);
    if (thread && !thread.archived) return thread;
  }
  return null;
}

function isStaff(member) {
  return (
    settings.supportRoleIds.some((id) => member.roles.cache.has(id)) ||
    member.permissions.has(PermissionFlagsBits.ManageThreads)
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
        '',
        '**📖 Ticket хэрхэн нээх вэ?**',
        '**1.** Доорх цэснээс асуудалдаа тохирох төрлийг сонгоно.',
        '**2.** Гарч ирсэн тайлбарыг уншаад **📝 Анкет бөглөх** товчийг дарна.',
        '**3.** Анкетаа бөглөж илгээхэд зөвхөн танд болон админ багт харагдах хувийн thread нээгдэнэ.',
        '',
        '**📌 Анхаарах зүйлс**',
        '• Нэг төрлийн асуудлаар нэг удаад зөвхөн нэг ticket нээх боломжтой.',
        '• Асуудлаа дэлгэрэнгүй, тодорхой бичвэл илүү хурдан шийдэгдэнэ.',
        '• Админуудыг дахин дахин mention хийх шаардлагагүй, тэд таны ticket-ийг харж байгаа.',
        '• Шаардлагагүй, тоглоом шоглоомын ticket нээхгүй байхыг хүсье.',
      ].join('\n'),
    )
    .addFields({
      name: '🎫 Ticket-ийн төрлүүд',
      value: categories.map((c) => `${c.emoji} **${c.label}** — ${c.description}`).join('\n'),
    })
    .setFooter({ text: 'LANN GAMING • Ticket System' });

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
    .setDescription((category.guide ?? [category.description]).join('\n'))
    .setFooter({ text: 'Бэлэн болсон бол доорх товчийг дарж анкетаа бөглөнө үү.' });
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
  const { channel: parent, guild, user } = interaction;
  const { supportRoleIds } = settings;
  if (!supportRoleIds.length) {
    return interaction.editReply(NOT_CONFIGURED);
  }

  // Members can have one open ticket per category.
  const existing = findOpenTicket(guild, user.id, category.key);
  if (existing) {
    return interaction.editReply(alreadyOpen(existing));
  }
  const lockKey = `${user.id}:${category.key}`;
  if (opening.has(lockKey)) {
    return interaction.editReply('⏳ Таны ticket үүсгэгдэж байна, түр хүлээнэ үү.');
  }

  opening.add(lockKey);
  try {
    const username = user.username.toLowerCase().replace(/[^a-z0-9-_.]/g, '') || user.id;
    const thread = await parent.threads.create({
      name: `${category.key}-${username}`.slice(0, 100),
      type: ChannelType.PrivateThread,
      // Only staff can add more people to the ticket.
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: `${category.label} ticket for ${user.tag}`,
    });
    tickets.set(thread.id, { ownerId: user.id, categoryKey: category.key });
    await thread.members.add(user.id);

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setTitle(`${category.emoji} ${category.label}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        [
          `Сайн байна уу ${user}! 👋`,
          'Таны ticket амжилттай нээгдлээ. Манай админ баг удахгүй тантай энд холбогдох болно.',
          '',
          '**⏭️ Дараа нь юу болох вэ?**',
          '• Админ таны ticket-ийг хариуцаж авахад энд мэдэгдэл гарна.',
          '• Нэмэлт мэдээлэл, screenshot, бичлэг байвал энэ thread-д шууд илгээж болно.',
          '• Асуудал шийдэгдсэн бол доорх **🔒 Хаах** товчоор ticket-ээ хаана уу.',
          '',
          '**📝 Таны анкет**',
        ].join('\n'),
      )
      .addFields(answers.map((a) => ({ name: a.label, value: a.value })))
      .setFooter({ text: `ticket:${user.id}:${category.key}` })
      .setTimestamp();

    // Mentioning the support roles also adds their members to the private thread.
    await thread.send({
      content: [user, ...supportRoleIds.map((id) => `<@&${id}>`)].join(' '),
      embeds: [embed],
      components: [ticketControls()],
      allowedMentions: { users: [user.id], roles: supportRoleIds },
    });

    return interaction.editReply(
      `✅ Таны ticket амжилттай нээгдлээ: ${thread}\nДээрх холбоос дээр дарж орон админ багийн хариуг хүлээнэ үү.`,
    );
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

  const header = `Transcript of ${channel.name}\n\n`;
  return new AttachmentBuilder(Buffer.from(header + lines.join('\n'), 'utf8'), {
    name: `${channel.name}-transcript.txt`,
  });
}

async function closeTicket(thread, closedBy, reason = 'Шалтгаан заагаагүй') {
  if (closing.has(thread.id)) return;
  closing.add(thread.id);

  const ticket = await getTicket(thread);
  const category = ticket && getCategory(ticket.categoryKey);
  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(RED)
        .setTitle('🔒 Ticket хаагдаж байна')
        .setDescription(`${closedBy} энэ ticket-ийг хаалаа.\nЭнэ thread **5 секундын** дараа устгагдана.`),
    ],
  });

  const transcript = await buildTranscript(thread);
  const details = [
    { name: '🎫 Ticket', value: thread.name, inline: true },
    { name: '📂 Төрөл', value: category ? `${category.emoji} ${category.label}` : '-', inline: true },
    { name: '👤 Нээсэн', value: ticket ? `<@${ticket.ownerId}>` : '-', inline: true },
    { name: '🔒 Хаасан', value: `${closedBy}`, inline: true },
    { name: '🕒 Нээгдсэн', value: `<t:${Math.floor(thread.createdTimestamp / 1000)}:f>`, inline: true },
    { name: '📝 Шалтгаан', value: reason },
  ];
  const embed = new EmbedBuilder().setColor(RED).setTitle('Ticket хаагдлаа').addFields(details).setTimestamp();

  if (settings.logChannelId) {
    const logChannel = await thread.guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed], files: [transcript] }).catch(console.error);
    }
  }

  if (ticket) {
    const owner = await thread.client.users.fetch(ticket.ownerId).catch(() => null);
    const dm = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('🎫 Таны ticket хаагдлаа')
      .setDescription(
        [
          `Сайн байна уу! **${thread.guild.name}** сервер дээр нээсэн таны ticket хаагдлаа.`,
          'Бүх яриан бичлэгийн хуулбарыг доор хавсаргав.',
          '',
          'Дахин тусламж хэрэгтэй бол ticket сувгаас шинэ ticket нээж болно. Баярлалаа! 💙',
        ].join('\n'),
      )
      .addFields(details.filter((f) => f.name !== '👤 Нээсэн'))
      .setTimestamp();
    // DMs fail if the user has them disabled; that's fine.
    await owner?.send({ embeds: [dm], files: [transcript] }).catch(() => {});
  }

  setTimeout(() => {
    thread
      .delete(`Ticket closed by ${closedBy.tag}`)
      .catch(console.error)
      .finally(() => {
        closing.delete(thread.id);
        forgetTicket(thread.id);
      });
  }, 5000);
}

module.exports = {
  NOT_CONFIGURED,
  alreadyOpen,
  claimedEmbed,
  getCategory,
  getTicket,
  loadOpenTickets,
  forgetTicket,
  findOpenTicket,
  isStaff,
  panelMessage,
  categoryPrompt,
  ticketModal,
  ticketControls,
  openTicket,
  closeTicket,
};
