const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const settings = require('../settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Ticket системийг тохируулах')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) =>
      o.setName('support_role').setDescription('Ticket-үүдийг харж, удирдах админ role').setRequired(true),
    )
    .addChannelOption((o) =>
      o
        .setName('log_channel')
        .setDescription('Хаагдсан ticket-ийн бичлэг очих суваг')
        .addChannelTypes(ChannelType.GuildText),
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('support_role');
    const logChannel = interaction.options.getChannel('log_channel');

    if (role.id === interaction.guild.roles.everyone.id) {
      return interaction.reply({
        content: '@everyone-ийг админ role болгох боломжгүй.',
        flags: MessageFlags.Ephemeral,
      });
    }

    settings.update({
      supportRoleId: role.id,
      ...(logChannel && { logChannelId: logChannel.id }),
    });

    const lines = [
      '✅ Ticket систем тохируулагдлаа.',
      `Админ role: ${role}`,
      `Log суваг: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'тохируулаагүй'}`,
    ];
    // The ping in each new ticket is what adds the support team to the private thread.
    if (!role.mentionable) {
      lines.push(
        '',
        '⚠️ Энэ role-ийг ping хийх боломжгүй байна, тиймээс админууд ticket thread-д автоматаар нэмэгдэхгүй. ' +
          'Server Settings → Roles → энэ role → **Allow anyone to @mention this role**-ийг асаана уу.',
      );
    }

    await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
  },
};
