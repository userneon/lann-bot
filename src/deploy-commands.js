const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commandsDir = path.join(__dirname, 'commands');
const commands = fs
  .readdirSync(commandsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(commandsDir, f)).data.toJSON());

const rest = new REST().setToken(config.token);

(async () => {
  // Guild commands update instantly, unlike global commands which can take up to an hour.
  const data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commands,
  });
  console.log(`Registered ${data.length} slash commands.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
