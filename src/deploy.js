
require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { createCommands, buildSlashCommands } = require('./core/commands');

async function deploy(clientId, token, guildId, registry) {
  if (!clientId) throw new Error('Missing DISCORD_CLIENT_ID / CLIENT_ID in .env');
  if (!token) throw new Error('Missing DISCORD_TOKEN / TOKEN in .env');

  const commands = buildSlashCommands(registry || createCommands());
  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    return { scope: 'guild', count: commands.length, guildId };
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  return { scope: 'global', count: commands.length };
}

if (require.main === module) {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '';
  const token = process.env.DISCORD_TOKEN || process.env.TOKEN || '';
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
  deploy(clientId, token, guildId)
    .then((result) => {
      console.log(`Deployed ${result.count} slash root command(s) (${result.scope}).`);
    })
    .catch((error) => {
      console.error('Deploy failed:', error);
      process.exit(1);
    });
}

module.exports = { deploy };
