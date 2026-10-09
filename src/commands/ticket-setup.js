const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const settings = require('../settings');

const MAX_ROLES = 5;

const data = new SlashCommandBuilder()
  .setName('ticket-setup')
  .setDescription('Ticket системийг тохируулах')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Discord has no multi-role option, so offer role_1 (required) up to role_5.
for (let i = 1; i <= MAX_ROLES; i++) {
  data.addRoleOption((o) =>
    o
      .setName(`role_${i}`)
      .setDescription('Ticket нээгдэхэд mention хийгдэж, ticket-ийг удирдах админ role')
      .setRequired(i === 1),
  );
}
data.addChannelOption((o) =>
  o
    .setName('log_channel')
    .setDescription('Хаагдсан ticket-ийн бичлэг очих суваг')
    .addChannelTypes(ChannelType.GuildText),
);

module.exports = {
  data,

  async execute(interaction) {
    const roles = [];
    for (let i = 1; i <= MAX_ROLES; i++) {
      const role = interaction.options.getRole(`role_${i}`);
      if (role && !roles.some((r) => r.id === role.id)) roles.push(role);
    }
    const logChannel = interaction.options.getChannel('log_channel');

    if (roles.some((r) => r.id === interaction.guild.roles.everyone.id)) {
      return interaction.reply({
        content: '@everyone-ийг админ role болгох боломжгүй.',
        flags: MessageFlags.Ephemeral,
      });
    }

    settings.update({
      supportRoleIds: roles.map((r) => r.id),
      ...(logChannel && { logChannelId: logChannel.id }),
    });

    const lines = [
      '✅ Ticket систем тохируулагдлаа.',
      `Админ role-ууд: ${roles.join(', ')}`,
      `Log суваг: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'тохируулаагүй'}`,
    ];
    // The ping in each new ticket is what adds the support team to the private thread.
    const unmentionable = roles.filter((r) => !r.mentionable);
    if (unmentionable.length) {
      lines.push(
        '',
        `⚠️ ${unmentionable.join(', ')} role-ийг ping хийх боломжгүй тул ticket thread-д автоматаар нэмэгдэхгүй. ` +
          'Server Settings → Roles → тухайн role → **Allow anyone to @mention this role**-ийг асаана уу.',
      );
    }

    await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
  },
};
