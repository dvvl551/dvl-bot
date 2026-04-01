
const ms = require('ms');
const { ActivityType, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

const ACTIVITY_TYPES = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  custom: ActivityType.Custom,
  competing: ActivityType.Competing
};

const ACTIVITY_TYPE_LABELS = {
  playing: 'Playing',
  streaming: 'Streaming',
  listening: 'Listening',
  watching: 'Watching',
  custom: 'Custom',
  competing: 'Competing'
};

function normalizeActivityType(input = '') {
  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'listing') return 'listening';
  return ACTIVITY_TYPES[raw] ? raw : null;
}

function randomOf(list = []) {
  return list[Math.floor(Math.random() * list.length)];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ensureHexColor(input, fallback = '#5865F2') {
  if (!input) return fallback;
  const normalized = String(input).startsWith('#') ? String(input) : `#${input}`;
  return /^#[0-9A-F]{6}$/i.test(normalized) ? normalized : fallback;
}

function parseDuration(input) {
  if (!input) return null;
  try {
    const result = ms(String(input));
    return typeof result === 'number' ? result : null;
  } catch {
    return null;
  }
}

function formatDuration(inputMs) {
  const totalSeconds = Math.max(0, Math.floor(inputMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function baseEmbed(guildConfig, title, description) {
  return new EmbedBuilder()
    .setColor(ensureHexColor(guildConfig?.embedColor))
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'DvL' })
    .setTimestamp();
}

function fillTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function parseUserArgument(arg, guild) {
  if (!arg || !guild) return null;
  const cleaned = String(arg).replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(cleaned)) return null;
  return guild.members.cache.get(cleaned) || null;
}

function parseRoleArgument(arg, guild) {
  if (!arg || !guild) return null;
  const cleaned = String(arg).replace(/[<@&>]/g, '');
  if (/^\d{17,20}$/.test(cleaned)) return guild.roles.cache.get(cleaned) || null;
  return guild.roles.cache.find((role) => role.name.toLowerCase() === String(arg).toLowerCase()) || null;
}

function parseChannelArgument(arg, guild) {
  if (!arg || !guild) return null;
  const cleaned = String(arg).replace(/[<#>]/g, '');
  if (/^\d{17,20}$/.test(cleaned)) return guild.channels.cache.get(cleaned) || null;
  return guild.channels.cache.find((channel) => channel.name.toLowerCase() === String(arg).toLowerCase()) || null;
}

function parseEmojiArg(input = '') {
  const custom = String(input).match(/^<a?:\w+:\d+>$/);
  if (custom) return custom[0];
  return String(input).trim();
}

function normalizeReactionEmoji(reaction) {
  if (!reaction?.emoji) return null;
  if (reaction.emoji.id) return `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`;
  return reaction.emoji.name;
}

function boolEmoji(value) {
  return value ? '🟢' : '🔴';
}

function code(text) {
  return `\`${String(text).replace(/`/g, 'ˋ')}\``;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function channelTypeName(channel) {
  const names = {
    [ChannelType.GuildText]: 'Text',
    [ChannelType.GuildVoice]: 'Voice',
    [ChannelType.GuildCategory]: 'Category',
    [ChannelType.GuildAnnouncement]: 'Announcement',
    [ChannelType.GuildForum]: 'Forum',
    [ChannelType.PublicThread]: 'Public Thread',
    [ChannelType.PrivateThread]: 'Private Thread'
  };
  return names[channel?.type] || String(channel?.type ?? 'Unknown');
}

function makeInviteUrl(clientId, permissions = PermissionsBitField.Flags.Administrator) {
  if (!clientId) return null;
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
}

module.exports = {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  normalizeActivityType,
  randomOf,
  clamp,
  ensureHexColor,
  parseDuration,
  formatDuration,
  baseEmbed,
  fillTemplate,
  parseUserArgument,
  parseRoleArgument,
  parseChannelArgument,
  parseEmojiArg,
  normalizeReactionEmoji,
  boolEmoji,
  code,
  chunk,
  channelTypeName,
  makeInviteUrl
};
