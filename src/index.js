const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const config = require('./config');
const components = require('./components');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Needed so transcripts include message text. Enable "Message Content Intent"
    // in the Developer Portal under Bot -> Privileged Gateway Intents.
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      const [scope, action, arg] = interaction.customId.split(':');
      const handler = components[`${scope}:${action}`];
      if (handler) await handler(interaction, arg);
    }
  } catch (error) {
    console.error(error);
    if (!interaction.isRepliable()) return;
    const content = 'Алдаа гарлаа. Дахин оролдоно уу, эсвэл админд хандана уу.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

client.login(config.token);
