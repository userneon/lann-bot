const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getTicket, isStaff, closeTicket } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Энэ ticket-ийг удирдах')
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Ticket-д хэрэглэгч нэмэх')
        .addUserOption((o) => o.setName('user').setDescription('Нэмэх хэрэглэгч').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Ticket-ээс хэрэглэгч хасах')
        .addUserOption((o) => o.setName('user').setDescription('Хасах хэрэглэгч').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('rename')
        .setDescription('Ticket-ийн нэрийг солих')
        .addStringOption((o) => o.setName('name').setDescription('Шинэ нэр').setRequired(true).setMaxLength(90)),
    )
    .addSubcommand((s) =>
      s
        .setName('close')
        .setDescription('Ticket-ийг хаах')
        .addStringOption((o) => o.setName('reason').setDescription('Хаах шалтгаан').setMaxLength(500)),
    ),

  async execute(interaction) {
    const { channel, member, options } = interaction;
    const sub = options.getSubcommand();
    const ticket = await getTicket(channel);
    const ephemeral = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

    if (!ticket) return ephemeral('ℹ️ Энэ командыг зөвхөн ticket thread дотор ашиглана.');
    const { ownerId } = ticket;

    if (sub === 'close') {
      if (!isStaff(member) && member.id !== ownerId) {
        return ephemeral('⛔ Зөвхөн админ баг эсвэл ticket нээсэн хүн ticket-ийг хаах боломжтой.');
      }
      await interaction.reply('🔒 Ticket хааж байна...');
      return closeTicket(channel, interaction.user, options.getString('reason') ?? undefined);
    }

    if (!isStaff(member)) return ephemeral('⛔ Үүнийг зөвхөн админ баг хийх боломжтой.');

    if (sub === 'add') {
      const user = options.getUser('user');
      await channel.members.add(user.id);
      return interaction.reply(`➕ ${user}-г ticket-д нэмлээ. Одоо тэр энэ thread-ийг харж, бичих боломжтой.`);
    }

    if (sub === 'remove') {
      const user = options.getUser('user');
      if (user.id === ownerId) return ephemeral('⛔ Ticket нээсэн хүнийг хасах боломжгүй. Шаардлагатай бол ticket-ийг хаана уу.');
      await channel.members.remove(user.id);
      return interaction.reply(`➖ ${user}-г ticket-ээс хаслаа.`);
    }

    if (sub === 'rename') {
      const name = options.getString('name').toLowerCase().replace(/\s+/g, '-');
      // Discord only allows 2 renames per 10 minutes, so this can be slow; defer to avoid timing out.
      await interaction.deferReply();
      await channel.setName(name);
      return interaction.editReply(`✏️ Ticket-ийн нэрийг **${channel.name}** болгож солилоо.`);
    }
  },
};
