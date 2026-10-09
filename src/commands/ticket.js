const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getTicketOwnerId, isStaff, closeTicket } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the current ticket')
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Add a user to this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a user from this ticket')
        .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('rename')
        .setDescription('Rename this ticket')
        .addStringOption((o) => o.setName('name').setDescription('New channel name').setRequired(true).setMaxLength(90)),
    )
    .addSubcommand((s) =>
      s
        .setName('close')
        .setDescription('Close this ticket')
        .addStringOption((o) => o.setName('reason').setDescription('Why the ticket is being closed').setMaxLength(500)),
    ),

  async execute(interaction) {
    const { channel, member, options } = interaction;
    const sub = options.getSubcommand();
    const ownerId = getTicketOwnerId(channel);
    const ephemeral = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

    if (!ownerId) return ephemeral('This command can only be used inside a ticket channel.');

    if (sub === 'close') {
      if (!isStaff(member) && member.id !== ownerId) {
        return ephemeral('Only staff or the ticket owner can close this ticket.');
      }
      await interaction.reply('Closing ticket...');
      return closeTicket(channel, interaction.user, options.getString('reason') ?? undefined);
    }

    if (!isStaff(member)) return ephemeral('Only support staff can do that.');

    if (sub === 'add') {
      const user = options.getUser('user');
      await channel.permissionOverwrites.edit(user, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });
      return interaction.reply(`Added ${user} to the ticket.`);
    }

    if (sub === 'remove') {
      const user = options.getUser('user');
      if (user.id === ownerId) return ephemeral("You can't remove the ticket owner. Close the ticket instead.");
      await channel.permissionOverwrites.delete(user);
      return interaction.reply(`Removed ${user} from the ticket.`);
    }

    if (sub === 'rename') {
      const name = options.getString('name').toLowerCase().replace(/\s+/g, '-');
      // Discord only allows 2 channel renames per 10 minutes, so this can be slow; defer to avoid timing out.
      await interaction.deferReply();
      await channel.setName(name);
      return interaction.editReply(`Ticket renamed to **${channel.name}**.`);
    }
  },
};
