require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { createCommands, buildSlashCommands } = require('./core/commands');

async function deploy(clientId, token, guildIds, registry) {
  if (!clientId) throw new Error('Missing DISCORD_CLIENT_ID / CLIENT_ID in .env');
  if (!token) throw new Error('Missing DISCORD_TOKEN / TOKEN in .env');

  const commands = buildSlashCommands(registry || createCommands());
  const rest = new REST({ version: '10' }).setToken(token);

  if (Array.isArray(guildIds) && guildIds.length) {
    const deployed = [];
    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      deployed.push(guildId);
    }
    return { scope: 'guild', count: commands.length, guildIds: deployed };
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  return { scope: 'global', count: commands.length };
}

if (require.main === module) {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '';
  const token = process.env.DISCORD_TOKEN || process.env.TOKEN || '';
  const guildIds = (
    process.env.DISCORD_GUILD_IDS ||
    process.env.GUILD_IDS ||
    process.env.DISCORD_GUILD_ID ||
    process.env.GUILD_ID ||
    ''
  )
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  deploy(clientId, token, guildIds)
    .then((result) => {
      if (result.scope === 'guild') console.log(`Deployed ${result.count} slash root command(s) to ${result.guildIds.length} guild(s): ${result.guildIds.join(', ')}`);
      else console.log(`Deployed ${result.count} slash root command(s) globally.`);
    })
    .catch((error) => {
      console.error('Deploy failed:', error);
      process.exit(1);
    });
}

module.exports = { deploy };
