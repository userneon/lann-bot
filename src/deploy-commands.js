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

function inviteUrl(appId) {
  return `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=360777370624&scope=bot+applications.commands`;
}

function fail(...lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

(async () => {
  // Check the setup first so a "Missing Access" error comes with an explanation.
  const app = await rest.get(Routes.currentApplication());
  if (app.id !== config.clientId) {
    fail(
      `CLIENT_ID (${config.clientId}) нь bot token-ий application-тай таарахгүй байна.`,
      `.env дотор CLIENT_ID=${app.id} болгож засна уу.`,
    );
  }

  const guilds = await rest.get(Routes.userGuilds());
  if (!guilds.some((g) => g.id === config.guildId)) {
    fail(
      `Бот GUILD_ID=${config.guildId} сервер дээр байхгүй байна.`,
      guilds.length
        ? `Бот байгаа серверүүд: ${guilds.map((g) => `${g.name} (${g.id})`).join(', ')}`
        : 'Бот одоогоор ямар ч сервер дээр байхгүй.',
      'GUILD_ID-гаа шалгах эсвэл ботыг энэ холбоосоор урина уу:',
      inviteUrl(app.id),
    );
  }

  // Guild commands update instantly, unlike global commands which can take up to an hour.
  try {
    const data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });
    console.log(`Registered ${data.length} slash commands.`);
  } catch (error) {
    if (error.code === 50001) {
      fail(
        'Бот сервер дээр байгаа ч slash команд бүртгэх эрхгүй байна (applications.commands).',
        'Ботыг серверээс гаргахгүйгээр энэ холбоосоор дахин орж, серверээ сонгоод Authorize дарна уу:',
        inviteUrl(app.id),
      );
    }
    throw error;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
