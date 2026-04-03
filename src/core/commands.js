
const crypto = require('crypto');
const axios = require('axios');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const {
  ACTIVITY_TYPES,
  baseEmbed,
  boolEmoji,
  channelTypeName,
  code,
  ensureHexColor,
  formatDuration,
  fillTemplate,
  makeInviteUrl,
  parseDuration,
  parseEmojiArg,
  randomOf
} = require('./utils');
const { fetchTikTokStatus } = require('./tiktok');
const { DEFAULT_GUILD } = require('./defaults');


const CATEGORY_META = {
  Home: { emoji: '🏠', style: ButtonStyle.Primary },
  Setup: { emoji: '🧩', style: ButtonStyle.Success },
  Categories: { emoji: '📂', style: ButtonStyle.Primary },
  All: { emoji: '📚', style: ButtonStyle.Secondary },
  System: { emoji: '🧰', style: ButtonStyle.Secondary },
  Config: { emoji: '⚙️', style: ButtonStyle.Secondary },
  General: { emoji: '✨', style: ButtonStyle.Primary },
  Fun: { emoji: '🎉', style: ButtonStyle.Success },
  Info: { emoji: '📌', style: ButtonStyle.Secondary },
  Utility: { emoji: '🛠️', style: ButtonStyle.Secondary },
  Automation: { emoji: '⚡', style: ButtonStyle.Primary },
  Progress: { emoji: '🏆', style: ButtonStyle.Success },
  Voice: { emoji: '🔊', style: ButtonStyle.Success },
  Moderation: { emoji: '🛡️', style: ButtonStyle.Danger },
  Security: { emoji: '🚨', style: ButtonStyle.Danger },
  Permissions: { emoji: '🔐', style: ButtonStyle.Secondary },
  Roles: { emoji: '🎭', style: ButtonStyle.Success },
  Welcome: { emoji: '👋', style: ButtonStyle.Primary },
  Support: { emoji: '📨', style: ButtonStyle.Primary },
  Giveaway: { emoji: '🎁', style: ButtonStyle.Success },
  Logs: { emoji: '🧾', style: ButtonStyle.Secondary },
  Tracking: { emoji: '📈', style: ButtonStyle.Primary },
  TikTok: { emoji: '🎵', style: ButtonStyle.Secondary },
  Owner: { emoji: '👑', style: ButtonStyle.Danger }
};

const CATEGORY_ORDER = ['General', 'System', 'Config', 'Welcome', 'Logs', 'Tracking', 'Support', 'Roles', 'Permissions', 'Voice', 'Security', 'Moderation', 'Automation', 'Progress', 'Giveaway', 'TikTok', 'Utility', 'Info', 'Owner', 'Fun'];


const CATEGORY_BLURBS = {
  General: 'Core everyday commands.',
  System: 'Panels, diagnostics and quick server tools.',
  Config: 'Base setup and bot settings.',
  Welcome: 'Welcome, leave and member-facing texts.',
  Logs: 'Audit logs, routes and log tests.',
  Tracking: 'Voice counters, invite stats and live numbers.',
  Support: 'DM relay and staff reply flow.',
  Roles: 'Auto roles, role panels and status roles.',
  Permissions: 'Custom access levels for commands.',
  Voice: 'Temp voice and voice moderation tools.',
  Security: 'Automod, whitelist and restricted channels.',
  Moderation: 'Warnings, timeout, kick and ban tools.',
  Automation: 'Sticky messages, auto react and helpers.',
  Progress: 'Trophy board and milestone rewards.',
  Giveaway: 'Giveaway start, edit, reroll and tracking.',
  TikTok: 'TikTok watchers, alerts and role rewards.',
  Utility: 'Small practical tools.',
  Info: 'Server and user info views.',
  Owner: 'Owner-only maintenance tools.',
  Fun: 'Light fun commands.'
};

const CONFIG_HELP_GROUPS = {
  'Core setup / overview': ['setup', 'config', 'setprefix', 'setembedcolor', 'setlanguage'],
  'System / panels / diagnostics': ['system', 'dashboard', 'configpanel', 'modules', 'setupcheck', 'backup'],
  'Welcome / leave texts': ['texts', 'welcome', 'leave', 'welcometoggle', 'setwelcomechannel', 'setwelcometitle', 'setwelcomemessage', 'leavetoggle', 'setleavechannel', 'setleavetitle', 'setleavemessage', 'leavedm', 'setleavedm', 'testleavedm', 'previewwelcome', 'previewleave', 'welcomeconfig'],
  'Logs / boost routing': ['logs', 'boost', 'boosttoggle', 'setboostchannel', 'setboosttitle', 'setboostmessage', 'previewboost', 'boostconfig', 'setlogchannel', 'logtoggle', 'logtype', 'logtypes', 'logconfig', 'logtest'],
  'Logs / routing': ['logs', 'setlogchannel', 'logtoggle', 'logtype', 'logtypes', 'logconfig', 'logtest'],
  'Tracking / invites / counters': ['tracking', 'stats', 'statschannel', 'statssetup', 'setstatslabel', 'statsrefresh', 'statsconfig', 'statsoff', 'invites', 'inviteleaderboard'],
  'Support / relay': ['support', 'reply', 'supporttoggle', 'setsupportchannel', 'setsupportrole', 'support panel', 'support relay', 'support entry', 'support text'],
  'Roles / access / status': ['roles', 'autorole', 'roleall', 'autoroleadd', 'autoroleremove', 'autorolelist', 'reactbutton', 'setstatusrole', 'statusroletoggle', 'statusroleconfig', 'clearstatusrole', 'statusrolecheck'],
  'Voice / temp voice': ['voice', 'createvoc', 'voicepanel', 'move', 'moveall', 'pull', 'voicekick', 'voicemute', 'voiceunmute', 'voiceban', 'voiceunban', 'setvoicemuterole', 'setvoicebanrole', 'voicepermconfig'],
  'Security / restricted channels': ['security', 'automodconfig', 'securitypreset', 'ghostping', 'setantispam', 'setantimention', 'setanticaps', 'setantiemoji', 'setraidage', 'automodignore', 'automodunignore', 'automodignored', 'badwordadd', 'badwordremove', 'badwords', 'wl', 'unwl', 'whitelistlist', 'piconly', 'piconlylist'],
  'Automation / sticky / auto react': ['automation', 'stickyset', 'stickyoff', 'stickyconfig', 'autoreact', 'remind', 'afk'],
  'Progress / trophy / milestones': ['trophy', 'trophychannel', 'trophyrefresh', 'trophyconfig', 'trophygoal', 'trophytitle', 'trophyimage', 'milestonerole', 'milestoneinterval', 'milestonechannel', 'milestoneconfig'],
  'Permission levels': ['permrole', 'permcmd', 'permconfig'],
  'Giveaways': ['giveaway', 'gstart', 'gend', 'greroll', 'gpause', 'gresume', 'gedit', 'gdelete', 'ginfo', 'gparticipants', 'glist'],
  'TikTok': ['tiktok', 'tiktokadd', 'tiktokremove', 'tiktoklist', 'tiktoksetrole', 'tiktoksetchannel', 'tiktoktogglelive', 'tiktoktogglevideo', 'tiktokforcecheck', 'tiktoktest']
};

const SETUP_GROUPS_PER_PAGE = 3;

const TRANSFORMS = [
  ['reverse', 'Reverse text', 'reverse <text>', ['rev'], (text) => text.split('').reverse().join('\n')],
  ['uppercase', 'Uppercase text', 'uppercase <text>', ['upper', 'caps'], (text) => text.toUpperCase()],
  ['lowercase', 'Lowercase text', 'lowercase <text>', ['lower'], (text) => text.toLowerCase()],
  ['spoiler', 'Wrap text in spoiler tags', 'spoiler <text>', ['spoil'], (text) => text.split(/\s+/).map((word) => `||${word}||`).join(' ')],
  ['clap', 'Insert 👏 between words', 'clap <text>', [], (text) => text.split(/\s+/).join(' 👏 ')],
  ['mock', 'Mocking text', 'mock <text>', [], (text) => text.split('').map((char, index) => (index % 2 ? char.toUpperCase() : char.toLowerCase())).join('\n')],
  ['binary', 'Encode text to binary', 'binary <text>', [], (text) => Array.from(text).map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')],
  ['base64', 'Encode text to base64', 'base64 <text>', ['b64'], (text) => Buffer.from(text).toString('base64')],
  ['hash', 'SHA256 hash', 'hash <text>', ['sha256'], (text) => crypto.createHash('sha256').update(text).digest('hex')]
];

const RANDOM_METERS = [
  ['rate', 'Rate something', 'rate <text>', ['rating'], '📊 Rate', 0, 100, '/100'],
  ['hotmeter', 'Random hot meter', 'hotmeter <text>', ['hot'], '🌡️ Hot meter', 0, 100, '%'],
  ['simp', 'Simp meter', 'simp <text>', [], '🫠 Simp meter', 0, 100, '% simp'],
  ['clown', 'Clown meter', 'clown <text>', [], '🤡 Clown meter', 0, 100, '% clown'],
  ['iq', 'Fake IQ meter', 'iq <text>', [], '🧠 IQ meter', 50, 200, ' IQ']
];

const RANDOM_LINES = {
  truth: [
    'What is the last thing you deleted from your phone?',
    'What is the most embarrassing thing you have done in voice chat?',
    'Who do you stalk the most in this server?'
  ],
  dare: [
    'Send a dramatic message in general chat.',
    'Type in full caps for 2 minutes.',
    'Change your nickname to something cursed for 10 minutes.'
  ],
  wyr: [
    'Lose Discord for 1 month or TikTok for 1 year?',
    'Read every message out loud or answer only in rhymes?',
    'Be muted for 24h or reply to everything with "yes boss"?'
  ]
};

const LOG_TYPE_CHOICES = [
  ['moderation', 'Moderation'],
  ['messageDelete', 'Message delete'],
  ['messageEdit', 'Message edit'],
  ['ghostPing', 'Ghost ping'],
  ['memberJoin', 'Member join'],
  ['memberLeave', 'Member leave'],
  ['memberUpdate', 'Member update'],
  ['giveaway', 'Giveaway'],
  ['security', 'Security'],
  ['tiktok', 'TikTok'],
  ['support', 'Support'],
  ['invite', 'Invite used'],
  ['inviteCreate', 'Invite create'],
  ['inviteDelete', 'Invite delete'],
  ['boost', 'Boost'],
  ['roleCreate', 'Role create'],
  ['roleDelete', 'Role delete'],
  ['roleUpdate', 'Role update'],
  ['channelCreate', 'Channel create'],
  ['channelDelete', 'Channel delete'],
  ['channelUpdate', 'Channel update'],
  ['voiceJoin', 'Voice join'],
  ['voiceLeave', 'Voice leave'],
  ['voiceMove', 'Voice move'],
  ['threadCreate', 'Thread create'],
  ['threadDelete', 'Thread delete'],
  ['serverUpdate', 'Server update']
];

const LOG_CHANNEL_GROUPS = [
  { key: 'messages', label: 'Messages', types: ['messageDelete', 'messageEdit', 'ghostPing'] },
  { key: 'members', label: 'Members / invites / boosts', types: ['memberJoin', 'memberLeave', 'memberUpdate', 'invite', 'boost'] },
  { key: 'moderation', label: 'Moderation / security', types: ['moderation', 'security', 'giveaway'] },
  { key: 'voice', label: 'Voice', types: ['voiceJoin', 'voiceLeave', 'voiceMove'] },
  { key: 'server', label: 'Server / roles / channels', types: ['roleCreate', 'roleDelete', 'roleUpdate', 'channelCreate', 'channelDelete', 'channelUpdate', 'threadCreate', 'threadDelete', 'serverUpdate'] },
  { key: 'social', label: 'Support / TikTok / invite codes', types: ['support', 'tiktok', 'inviteCreate', 'inviteDelete'] }
];

const LOG_GROUP_ALIASES = {
  default: 'default',
  all: 'default',
  logs: 'default',
  global: 'default',
  message: 'messages',
  messages: 'messages',
  msg: 'messages',
  msgs: 'messages',
  member: 'members',
  members: 'members',
  people: 'members',
  user: 'members',
  users: 'members',
  moderation: 'moderation',
  mod: 'moderation',
  mods: 'moderation',
  voice: 'voice',
  vocal: 'voice',
  vc: 'voice',
  server: 'server',
  guild: 'server',
  social: 'social'
};

const LOG_TYPE_ALIASES = {
  mod: 'moderation',
  moderation: 'moderation',
  delete: 'messageDelete',
  messagedelete: 'messageDelete',
  msgdelete: 'messageDelete',
  edit: 'messageEdit',
  messageedit: 'messageEdit',
  msgedit: 'messageEdit',
  ghost: 'ghostPing',
  ghostping: 'ghostPing',
  join: 'memberJoin',
  memberjoin: 'memberJoin',
  leave: 'memberLeave',
  memberleave: 'memberLeave',
  update: 'memberUpdate',
  memberupdate: 'memberUpdate',
  giveaway: 'giveaway',
  security: 'security',
  tiktok: 'tiktok',
  support: 'support',
  invite: 'invite',
  inviteused: 'invite',
  invitecreate: 'inviteCreate',
  invitedelete: 'inviteDelete',
  boost: 'boost',
  rolecreate: 'roleCreate',
  roledelete: 'roleDelete',
  roleupdate: 'roleUpdate',
  channelcreate: 'channelCreate',
  channeldelete: 'channelDelete',
  channelupdate: 'channelUpdate',
  voicejoin: 'voiceJoin',
  vjoin: 'voiceJoin',
  voiceleave: 'voiceLeave',
  vleave: 'voiceLeave',
  voicemove: 'voiceMove',
  vmove: 'voiceMove',
  threadcreate: 'threadCreate',
  threaddelete: 'threadDelete',
  serverupdate: 'serverUpdate'
};

function normalizeLogToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLogTypeLabel(type) {
  return LOG_TYPE_CHOICES.find(([value]) => value === type)?.[1] || type;
}

function resolveLogTarget(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const token = normalizeLogToken(raw);
  const family = LOG_GROUP_ALIASES[token];
  if (family) {
    return {
      kind: family === 'default' ? 'default' : 'family',
      key: family,
      label: family === 'default' ? 'Default route' : (LOG_CHANNEL_GROUPS.find((group) => group.key === family)?.label || family)
    };
  }
  const type = LOG_TYPE_CHOICES.find(([key]) => normalizeLogToken(key) === token)?.[0] || LOG_TYPE_ALIASES[token] || null;
  if (type) return { kind: 'type', key: type, label: getLogTypeLabel(type) };
  return null;
}

function getTypesForLogTarget(target) {
  if (!target) return [];
  if (target.kind === 'type') return [target.key];
  if (target.kind === 'family') return LOG_CHANNEL_GROUPS.find((group) => group.key === target.key)?.types || [];
  if (target.kind === 'default') return LOG_TYPE_CHOICES.map(([key]) => key);
  return [];
}

function getLogRouteKeyForType(type) {
  return LOG_CHANNEL_GROUPS.find((group) => group.types.includes(type))?.key || 'default';
}

function getResolvedLogChannelId(logs, type) {
  const typeChannels = logs?.typeChannels || {};
  const routeChannels = logs?.channels || {};
  return typeChannels[type] || routeChannels[getLogRouteKeyForType(type)] || routeChannels.default || logs?.channelId || null;
}

function isLogsTextChannel(channel) {
  return Boolean(channel && [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type));
}

function splitLinesForField(lines, chunkSize = 8) {
  const chunks = [];
  for (let i = 0; i < lines.length; i += chunkSize) chunks.push(lines.slice(i, i + chunkSize));
  return chunks;
}

function createLogsOverviewEmbed(guildConfig, prefix = '+') {
  const logs = guildConfig.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
  const defaultChannelId = logs.channels?.default || logs.channelId || null;
  const familyLines = LOG_CHANNEL_GROUPS.map((group) => {
    const channelId = logs.channels?.[group.key] || null;
    return `• **${group.label}** → ${channelId ? `<#${channelId}>` : 'default route'}`;
  });
  const typeOverrides = Object.entries(logs.typeChannels || {})
    .filter(([, channelId]) => Boolean(channelId))
    .map(([type, channelId]) => `• **${getLogTypeLabel(type)}** → <#${channelId}>`)
    .sort((a, b) => a.localeCompare(b));
  const enabledTypes = LOG_TYPE_CHOICES.filter(([type]) => logs.types?.[type] !== false).map(([type]) => type);
  const disabledTypes = LOG_TYPE_CHOICES.filter(([type]) => logs.types?.[type] === false).map(([type]) => `• ${getLogTypeLabel(type)}`);

  const embed = baseEmbed(guildConfig, '🧾 Logs overview', 'Main place for logs routing, event toggles and quick tests.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Master:** ${logs.enabled ? 'on' : 'off'}`,
          `**Default route:** ${defaultChannelId ? `<#${defaultChannelId}>` : 'not set'}`,
          `**Families routed:** ${Object.values(logs.channels || {}).filter(Boolean).length}`,
          `**Direct per-type routes:** ${typeOverrides.length}`,
          `**Enabled event types:** ${enabledTypes.length}/${LOG_TYPE_CHOICES.length}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'One-shot setup',
        value: [
          `\`${prefix}logs setup\` → create category + separated channels`,
          `\`${prefix}logs on\` → turn the whole module on`,
          `\`${prefix}logs view\` → show current routes`,
          `\`${prefix}logs test all\` → verify important routes`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Fast routing',
        value: [
          `\`${prefix}logs messages #message-logs\``,
          `\`${prefix}logs members #member-logs\``,
          `\`${prefix}logs moderation #mod-logs\``,
          `\`${prefix}logs boost here\``
        ].join('\n'),
        inline: false
      }
    );

  embed.addFields({ name: 'Families', value: familyLines.join('\n').slice(0, 1024), inline: false });
  if (typeOverrides.length) {
    const chunks = splitLinesForField(typeOverrides, 10);
    chunks.forEach((chunk, index) => embed.addFields({ name: index === 0 ? 'Direct per-type routes' : 'Direct per-type routes (more)', value: chunk.join('\n').slice(0, 1024), inline: false }));
  }
  if (disabledTypes.length) {
    const chunks = splitLinesForField(disabledTypes, 14);
    chunks.forEach((chunk, index) => embed.addFields({ name: index === 0 ? 'Disabled event types' : 'Disabled event types (more)', value: chunk.join('\n').slice(0, 1024), inline: false }));
  }

  return embed.addFields({
    name: 'Good to know',
    value: [
      `• families are broad routes like messages / members / moderation`,
      `• direct per-type routes override family routes`,
      `• \`${prefix}logs enable <type>\` and \`${prefix}logs disable <type>\` control which events are sent`,
      `• \`${prefix}logs types\` shows every precise event name`
    ].join('\n').slice(0, 1024),
    inline: false
  });
}

function createLogTypesEmbed(guildConfig, prefix = '+') {
  const embed = baseEmbed(guildConfig, '🧾 Log types', `Use \`${prefix}logs <type> here\` to route one precise type, or \`${prefix}logs enable <type>\` / \`${prefix}logs disable <type>\`.`);
  for (const group of LOG_CHANNEL_GROUPS) {
    const lines = group.types.map((type) => `• **${type}** — ${getLogTypeLabel(type)}`);
    embed.addFields({ name: group.label, value: lines.join('\n').slice(0, 1024), inline: false });
  }
  return embed;
}

function applyLogChannelTarget(guild, target, channelId) {
  guild.logs = guild.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
  guild.logs.channels = guild.logs.channels || { default: null, messages: null, members: null, moderation: null, voice: null, server: null, social: null };
  guild.logs.typeChannels = guild.logs.typeChannels || {};
  if (target.kind === 'default') {
    guild.logs.channels.default = channelId;
    guild.logs.channelId = channelId;
  } else if (target.kind === 'family') {
    guild.logs.channels[target.key] = channelId;
  } else if (target.kind === 'type') {
    if (channelId) guild.logs.typeChannels[target.key] = channelId;
    else delete guild.logs.typeChannels[target.key];
  }
  return guild;
}

function setLogTypesState(guild, types, enabled) {
  guild.logs = guild.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
  guild.logs.types = guild.logs.types || {};
  for (const type of types) guild.logs.types[type] = enabled;
  return guild;
}


const AUTOMOD_PUNISH_CHOICES = [
  { name: 'delete', value: 'delete' },
  { name: 'timeout', value: 'timeout' }
];

function automodRuleLabel(rule, fallback = 'delete') {
  const enabled = rule?.enabled ? 'on' : 'off';
  const punish = rule?.punish || fallback;
  const extras = [];
  if (typeof rule?.maxMessages !== 'undefined') extras.push(`${rule.maxMessages}/${rule.perSeconds || 6}s`);
  if (typeof rule?.maxMentions !== 'undefined') extras.push(`${rule.maxMentions} mentions`);
  if (typeof rule?.percent !== 'undefined') extras.push(`${rule.percent}% caps`);
  if (typeof rule?.maxEmojis !== 'undefined') extras.push(`${rule.maxEmojis} emojis`);
  if (typeof rule?.joinAgeMinutes !== 'undefined') extras.push(`${rule.joinAgeMinutes} min account age`);
  return `**${enabled}** • action: **${punish}**${extras.length ? ` • ${extras.join(' • ')}` : ''}`;
}

function getLogChannelGroup(key) {
  return LOG_CHANNEL_GROUPS.find((group) => group.key === key) || LOG_CHANNEL_GROUPS[0];
}

function getLogGroupChoices() {
  return [
    { name: 'default', value: 'default' },
    ...LOG_CHANNEL_GROUPS.map((group) => ({ name: group.key, value: group.key }))
  ];
}

const STATS_TYPE_CHOICES = [
  { name: 'members', value: 'members' },
  { name: 'online', value: 'online' },
  { name: 'voice', value: 'voice' }
];

function formatStatNumber(value) {
  return Number(value || 0).toLocaleString('fr-FR');
}

function buildStatsChannelName(template, count) {
  const formatted = formatStatNumber(count);
  const raw = String(template || '{count}').trim();
  const withCount = raw.includes('{count}') ? raw.replace(/\{count\}/gi, formatted) : `${raw} ${formatted}`;
  return withCount.slice(0, 100);
}

function getLiveGuildStats(guild) {
  const members = guild?.memberCount || guild?.members?.cache?.size || 0;
  const online = guild?.presences?.cache
    ? guild.presences.cache.filter((presence) => presence?.status && presence.status !== 'offline').size
    : 0;
  const voice = guild?.voiceStates?.cache
    ? guild.voiceStates.cache.filter((state) => state?.channelId && !state?.member?.user?.bot).size
    : 0;
  const streaming = guild?.presences?.cache
    ? guild.presences.cache.filter((presence) => {
        const member = guild.members.cache.get(presence.userId);
        if (member?.user?.bot) return false;
        return Array.isArray(presence.activities) && presence.activities.some((activity) => activity?.type === 1);
      }).size
    : 0;
  return { members, online, voice, streaming };
}

async function ensureStatsVoiceChannel(guild, name, parentId) {
  return guild.channels.create({
    name: String(name || 'Stat').slice(0, 100),
    type: ChannelType.GuildVoice,
    parent: parentId || null,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
      }
    ],
    reason: 'DvL server stats setup'
  }).catch(() => null);
}

async function refreshConfiguredStatsChannels(guild, guildConfig) {
  if (!guild || !guildConfig?.stats?.enabled) return null;
  const stats = guildConfig.stats || {};
  const labels = stats.labels || {};
  const live = getLiveGuildStats(guild);
  const targets = {
    members: { channelId: stats.channels?.members, name: buildStatsChannelName(labels.members || '👥・Membres : {count}', live.members) },
    online: { channelId: stats.channels?.online, name: buildStatsChannelName(labels.online || '🌐・En ligne : {count}', live.online) },
    voice: { channelId: stats.channels?.voice, name: buildStatsChannelName(labels.voice || '🔊・Vocal : {count}', live.voice) }
  };
  for (const entry of Object.values(targets)) {
    if (!entry.channelId) continue;
    const channel = guild.channels.cache.get(entry.channelId) || await guild.channels.fetch(entry.channelId).catch(() => null);
    if (!channel) continue;
    if (channel.name !== entry.name) await channel.setName(entry.name).catch(() => null);
  }
  return { live, targets };
}


async function collectWhitelistOverview(ctx) {
  const automod = ctx.guildConfig.automod || {};
  const userIds = Array.from(new Set((automod.whitelistUserIds || []).map(String).filter(Boolean)));
  const roleIds = Array.from(new Set((automod.whitelistRoleIds || []).map(String).filter(Boolean)));
  const users = [];
  const roles = [];
  const brokenUsers = [];
  const brokenRoles = [];

  for (const id of userIds) {
    const member = ctx.guild.members.cache.get(id) || await ctx.guild.members.fetch(id).catch(() => null);
    const user = member?.user || await ctx.client.users.fetch(id).catch(() => null);
    if (user) users.push({ id, label: `<@${id}> — \`${user.tag}\`` });
    else brokenUsers.push(id);
  }

  for (const id of roleIds) {
    const role = ctx.guild.roles.cache.get(id) || await ctx.guild.roles.fetch(id).catch(() => null);
    if (role) roles.push({ id, label: `<@&${id}> — \`${role.name}\`` });
    else brokenRoles.push(id);
  }

  return { users, roles, brokenUsers, brokenRoles };
}

async function cleanWhitelistEntries(ctx) {
  const overview = await collectWhitelistOverview(ctx);
  ctx.store.updateGuild(ctx.guild.id, (guild) => {
    guild.automod.whitelistUserIds = overview.users.map((entry) => entry.id);
    guild.automod.whitelistRoleIds = overview.roles.map((entry) => entry.id);
    return guild;
  });
  return overview;
}

async function buildWhitelistEmbeds(ctx) {
  const overview = await collectWhitelistOverview(ctx);
  const result = [baseEmbed(ctx.guildConfig, '✅ Automod whitelist', [
    `**Users:** ${overview.users.length}`,
    `**Roles:** ${overview.roles.length}`,
    `**Broken IDs:** ${overview.brokenUsers.length + overview.brokenRoles.length}`,
    '',
    `Quick use: \`${ctx.prefix}wl @user\` • \`${ctx.prefix}wl @role\` • \`${ctx.prefix}wl clean\``
  ].join('\n'))];

  const blocks = [
    ['Users', overview.users.map((entry, index) => `**${index + 1}.** ${entry.label}`)],
    ['Roles', overview.roles.map((entry, index) => `**${index + 1}.** ${entry.label}`)],
    ['Broken user IDs', overview.brokenUsers.map((id, index) => `**${index + 1}.** \`${id}\``)],
    ['Broken role IDs', overview.brokenRoles.map((id, index) => `**${index + 1}.** \`${id}\``)]
  ];

  for (const [label, lines] of blocks) {
    if (!lines.length) continue;
    const chunks = chunkLines(lines, 8);
    for (const [index, chunk] of chunks.entries()) {
      let current = result[result.length - 1];
      if ((current.data.fields?.length || 0) >= 3) {
        current = baseEmbed(ctx.guildConfig, '✅ Automod whitelist', 'Continuation');
        result.push(current);
      }
      current.addFields({
        name: chunks.length > 1 ? `${label} • page ${index + 1}/${chunks.length}` : label,
        value: chunk.join('\n').slice(0, 1024),
        inline: false
      });
    }
  }

  if (!result[0].data.fields?.length) {
    result[0].setDescription([
      'No user or role is whitelisted yet.',
      '',
      `Quick use: \`${ctx.prefix}wl @user\` • \`${ctx.prefix}wl @role\``
    ].join('\n'));
  }
  return result;
}

function buildSectionedListEmbeds(guildConfig, title, introLines = [], sections = [], options = {}) {
  const safeChunkSize = Math.max(1, Number(options.chunkSize) || 6);
  const safeMaxFields = Math.max(1, Number(options.maxFields) || 3);
  const continuationTitle = options.continuationTitle || title;
  const introText = Array.isArray(introLines) ? introLines.filter(Boolean).join('\n') : String(introLines || '');
  const embeds = [baseEmbed(guildConfig, title, introText || (options.emptyText || 'Nothing to show.'))];

  for (const [label, rawLines] of sections) {
    const lines = (rawLines || []).filter(Boolean);
    if (!lines.length) continue;
    const chunks = chunkLines(lines, safeChunkSize);
    for (const [index, chunk] of chunks.entries()) {
      let current = embeds[embeds.length - 1];
      if ((current.data.fields?.length || 0) >= safeMaxFields) {
        current = baseEmbed(guildConfig, continuationTitle, options.continuationDescription || 'Continuation');
        embeds.push(current);
      }
      current.addFields({
        name: chunks.length > 1 ? `${label} • page ${index + 1}/${chunks.length}` : label,
        value: chunk.join('\n').slice(0, 1024),
        inline: false
      });
    }
  }

  if (!embeds[0].data.fields?.length && options.emptyText) embeds[0].setDescription(options.emptyText);
  return embeds;
}

async function buildAutoRoleEmbeds(ctx) {
  const ids = Array.from(new Set((ctx.guildConfig.roles?.autoRoles || []).map(String).filter(Boolean)));
  const roles = [];
  const broken = [];
  for (const id of ids) {
    const role = ctx.guild.roles.cache.get(id) || await ctx.guild.roles.fetch(id).catch(() => null);
    if (role) roles.push(`**${roles.length + 1}.** <@&${id}> — \`${role.name}\``);
    else broken.push(`**${broken.length + 1}.** \`${id}\``);
  }
  return buildSectionedListEmbeds(
    ctx.guildConfig,
    '🎭 Auto roles',
    [
      `**Valid roles:** ${roles.length}`,
      `**Broken IDs:** ${broken.length}`,
      '',
      `Quick use: \`${ctx.prefix}autoroleadd @role\` • \`${ctx.prefix}autoroleremove @role\``
    ],
    [
      ['Roles', roles],
      ['Broken IDs', broken]
    ],
    {
      chunkSize: 8,
      emptyText: ['No auto roles set yet.', '', `Quick use: \`${ctx.prefix}autoroleadd @role\``].join('\n')
    }
  );
}

function buildBackupListEmbeds(ctx, backups) {
  const lines = backups.map((entry, index) => {
    const when = new Date(entry.createdAt).toLocaleString('fr-FR', { hour12: false });
    return [
      `**${index + 1}.** \`${entry.id}\` • **${entry.name || 'Unnamed'}**`,
      `↳ ${when} • from **${entry.sourceGuildName || 'Unknown server'}**`,
      `↳ ${entry.meta?.channels || 0} ch • ${entry.meta?.roles || 0} roles • ${entry.meta?.members || 0} members`
    ].join('\n');
  });
  return buildSectionedListEmbeds(
    ctx.guildConfig,
    '💾 Saved backups',
    [
      `**Stored:** ${backups.length}/50`,
      '',
      `Use \`${ctx.prefix}backup load latest\` or \`${ctx.prefix}backup info <id>\`.`
    ],
    [['Backups', lines]],
    {
      chunkSize: 4,
      emptyText: `No backups saved yet. Use \`${ctx.prefix}backup create\` first.`
    }
  );
}

function buildGiveawayListEmbeds(ctx, entries) {
  const lines = entries.map((g, index) => [
    `**${index + 1}.** ${getGiveawayStateEmoji(g)} **${g.id}** • ${g.prize}`,
    `↳ state: **${getGiveawayStateLabel(g)}** • winners: ${g.winners} • participants: ${(g.participants || []).length}`,
    `↳ message: \`${g.messageId || 'none'}\` • channel: ${g.channelId ? `<#${g.channelId}>` : 'none'}`
  ].join('\n'));
  return buildSectionedListEmbeds(
    ctx.guildConfig,
    '🎁 Giveaways',
    [
      `**Saved giveaways:** ${entries.length}`,
      '',
      `Use \`${ctx.prefix}ginfo <id>\` or \`${ctx.prefix}gparticipants <id>\`.`
    ],
    [['Giveaways', lines]],
    {
      chunkSize: 4,
      emptyText: 'No giveaways saved.'
    }
  );
}

function buildTikTokWatcherEmbeds(ctx) {
  const watchers = ctx.guildConfig.tiktok?.watchers || [];
  const lines = watchers.map((watcher, index) => [
    `**${index + 1}.** **@${watcher.username}** → ${watcher.channelId ? `<#${watcher.channelId}>` : 'missing channel'}`,
    `↳ ping: ${watcher.mentionRoleId ? `<@&${watcher.mentionRoleId}>` : 'none'} • live: ${boolEmoji(watcher.announceLive)} • video: ${boolEmoji(watcher.announceVideos)}`,
    `↳ source: ${watcher.lastSource || 'n/a'}${watcher.lastError ? ` • error: ${watcher.lastError}` : ''}`
  ].join('\n'));
  return buildSectionedListEmbeds(
    ctx.guildConfig,
    '🎵 TikTok watchers',
    [
      `**Watchers:** ${watchers.length}`,
      '',
      `Quick use: \`${ctx.prefix}tiktok add username here\` • \`${ctx.prefix}tiktok check\``
    ],
    [['Watchers', lines]],
    {
      chunkSize: 4,
      emptyText: 'No TikTok watchers.'
    }
  );
}


function getTargetUserLike(target) {
  return target?.user || target || null;
}

function getTargetAvatarUrl(target) {
  const user = getTargetUserLike(target);
  return user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
}

function getTargetTag(target) {
  const user = getTargetUserLike(target);
  return user?.tag || user?.username || null;
}

function getTargetMention(target) {
  if (!target) return 'Unknown';
  if (target.id) return `<@${target.id}>`;
  return String(target);
}

function getDmStatusLabel(dmSent, unavailableLabel = 'failed / closed') {
  return dmSent ? 'sent' : unavailableLabel;
}

function buildMemberActionEmbed(guildConfig, title, description, target, fields = [], options = {}) {
  const embed = baseEmbed(guildConfig, title, description);
  const tag = getTargetTag(target);
  const avatarUrl = getTargetAvatarUrl(target);
  if (tag) embed.setAuthor({ name: tag, iconURL: avatarUrl || undefined });
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  const safeFields = (fields || [])
    .filter((field) => field && field.name && typeof field.value !== 'undefined' && field.value !== null && String(field.value).trim())
    .slice(0, 10)
    .map((field) => ({
      name: String(field.name).slice(0, 256),
      value: String(field.value).slice(0, 1024),
      inline: Boolean(field.inline)
    }));
  if (safeFields.length) embed.addFields(...safeFields);
  if (options.footerText) embed.setFooter({ text: String(options.footerText).slice(0, 2048) });
  return embed;
}

async function sendDetailedModerationLog(ctx, title, description, target, fields = [], extra = {}) {
  if (typeof ctx.client.sendLog !== 'function') return;
  await ctx.client.sendLog(ctx.guild, 'moderation', title, description, {
    userId: target?.id || getTargetUserLike(target)?.id || null,
    authorName: getTargetTag(target),
    avatarUrl: getTargetAvatarUrl(target),
    fields,
    ...extra
  });
}


function makeMiniProgressBar(percent) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.max(0, Math.min(10, Math.round(safe / 10)));
  return `${'🟩'.repeat(filled)}${'⬜'.repeat(10 - filled)} **${safe}%**`;
}

function computeGoalProgress(current, goal) {
  const target = Number(goal) || 0;
  const value = Number(current) || 0;
  if (!target) return null;
  const percent = Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  const remaining = Math.max(0, target - value);
  return { target, value, percent, remaining, done: value >= target };
}

function formatGoalCard(label, current, goal) {
  const info = computeGoalProgress(current, goal);
  if (!info) return `${label}: not set`;
  return [
    `**${label}:** ${formatStatNumber(info.value)} / ${formatStatNumber(info.target)}`,
    makeMiniProgressBar(info.percent),
    info.done ? 'Goal reached ✅' : `Remaining: **${formatStatNumber(info.remaining)}**`
  ].join('\n');
}

function getServerTrophyImage(guildConfig, guild) {
  return guild?.iconURL?.({ extension: 'png', size: 512 }) || guild?.iconURL?.() || null;
}

function getServerTrophyTitle(guildConfig, guild) {
  return `${guild?.name || 'Server'} 🏆 • Statistiques !`;
}

function getNextMemberRewardTarget(current, interval) {
  const safeInterval = Math.max(1, Number(interval) || 100);
  return Math.ceil((Math.max(0, Number(current) || 0) + 1) / safeInterval) * safeInterval;
}


function normalizeStatsTypeInput(raw = '') {
  const value = String(raw || '').trim().toLowerCase();
  const map = {
    member: 'members',
    members: 'members',
    membre: 'members',
    membres: 'members',
    online: 'online',
    enligne: 'online',
    en_ligne: 'online',
    voice: 'voice',
    vocal: 'voice',
    voc: 'voice'
  };
  return map[value] || null;
}

function createUserProfileEmbed(guildConfig, guild, member, extra = {}) {
  const user = member.user;
  const invites = Number(guildConfig.invites?.stats?.[user.id]?.count || 0);
  const warnings = (guildConfig.moderation?.warnings?.[user.id] || []).length;
  const joined = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'unknown';
  const created = user.createdTimestamp ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : 'unknown';
  const voice = member.voice?.channelId ? `<#${member.voice.channelId}>` : 'not in voice';
  const roleCount = Math.max(0, member.roles.cache.filter((role) => role.id !== guild.id).size);
  const badges = [];
  if (member.premiumSinceTimestamp) badges.push('🚀 Booster');
  if (member.permissions.has(PermissionFlagsBits.Administrator)) badges.push('🛡️ Admin');
  if (!badges.length) badges.push('✨ Member');

  const embed = baseEmbed(guildConfig, `👤 Profile • ${user.username}`, [
    `${member}`,
    `**Invites:** ${formatStatNumber(invites)}`,
    `**Warnings:** ${formatStatNumber(warnings)}`
  ].join('\n'))
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: 'Server',
        value: [
          `**Joined:** ${joined}`,
          `**Voice:** ${voice}`,
          `**Roles:** ${formatStatNumber(roleCount)}`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Account',
        value: [
          `**Created:** ${created}`,
          `**ID:** \`${user.id}\``,
          `**Badges:** ${badges.join(' • ')}`
        ].join('\n'),
        inline: true
      },
      { name: 'Useful commands', value: '`+profile @user` • `+user` • `+whois`', inline: false }
    )
    .setFooter({ text: extra.footer || 'DvL • user profile' });

  if (extra.note) embed.addFields({ name: 'Update', value: extra.note, inline: false });
  return embed;
}

function computeServerProgressSnapshot(guild, guildConfig = {}) {
  const live = getLiveGuildStats(guild);
  const boosts = guild?.premiumSubscriptionCount || 0;
  const roleCount = guild?.roles?.cache?.filter((role) => role.id !== guild.id).size || 0;
  const channelCount = guild?.channels?.cache?.filter((channel) => !channel.isThread?.()).size || 0;
  const configuredLevels = Object.values(guildConfig.permissions?.levels || {}).filter((entry) => entry?.roleId || (entry?.commands || []).length).length;
  const securityEnabled = [
    guildConfig.automod?.antiSpam?.enabled,
    guildConfig.automod?.antiLink?.enabled,
    guildConfig.automod?.antiInvite?.enabled,
    guildConfig.automod?.antiMention?.enabled,
    guildConfig.automod?.antiCaps?.enabled,
    guildConfig.automod?.antiEmojiSpam?.enabled,
    guildConfig.automod?.ghostPing?.enabled,
    guildConfig.automod?.raidMode?.enabled,
    guildConfig.automod?.badWordsEnabled
  ].filter(Boolean).length;
  const rolePanelCount = Object.keys(guildConfig.roles?.rolePanels || {}).length + Object.keys(guildConfig.roles?.reactionRoles || {}).length;
  const modules = [
    ['Welcome', guildConfig.welcome?.enabled && guildConfig.welcome?.channelId],
    ['Leave', guildConfig.leave?.enabled && guildConfig.leave?.channelId],
    ['Logs', guildConfig.logs?.enabled && (guildConfig.logs?.channelId || guildConfig.logs?.channels?.default || Object.values(guildConfig.logs?.channels || {}).some(Boolean))],
    ['Ghost ping', guildConfig.automod?.ghostPing?.enabled],
    ['Support', guildConfig.support?.enabled && guildConfig.support?.channelId],
    ['Auto roles', (guildConfig.roles?.autoRoles || []).length > 0],
    ['Role panels', rolePanelCount > 0],
    ['Status role', guildConfig.roles?.statusRole?.enabled && guildConfig.roles?.statusRole?.roleId && guildConfig.roles?.statusRole?.matchText],
    ['Voice hub', guildConfig.voice?.temp?.hubChannelId || guildConfig.voice?.temp?.panelMessageId],
    ['Voice moderation', guildConfig.voice?.moderation?.muteRoleId || guildConfig.voice?.moderation?.banRoleId],
    ['Stats', guildConfig.stats?.enabled && Object.values(guildConfig.stats?.channels || {}).some(Boolean)],
    ['TikTok', (guildConfig.tiktok?.watchers || []).length > 0],
    ['Security', securityEnabled > 0],
    ['Permission levels', configuredLevels > 0]
  ];
  const completedModules = modules.filter(([, enabled]) => Boolean(enabled)).length;
  const completionPercent = Math.round((completedModules / Math.max(1, modules.length)) * 100);
  const setupTier = completionPercent >= 90 ? 'Legend' : completionPercent >= 75 ? 'Diamond' : completionPercent >= 55 ? 'Gold' : completionPercent >= 35 ? 'Silver' : 'Bronze';
  const growthMilestones = [25, 50, 100, 250, 500, 1000];
  const boostMilestones = [1, 7, 14];
  const voiceMilestones = [5, 10, 20, 50];
  const unlockedGrowth = growthMilestones.filter((value) => live.members >= value).length;
  const unlockedBoosts = boostMilestones.filter((value) => boosts >= value).length;
  const unlockedVoice = voiceMilestones.filter((value) => live.voice >= value).length;
  const nextGrowth = growthMilestones.find((value) => live.members < value) || null;
  const nextBoost = boostMilestones.find((value) => boosts < value) || null;
  const nextVoice = voiceMilestones.find((value) => live.voice < value) || null;
  const customGoals = {
    members: computeGoalProgress(live.members, guildConfig.progress?.customGoals?.members),
    boosts: computeGoalProgress(boosts, guildConfig.progress?.customGoals?.boosts),
    voice: computeGoalProgress(live.voice, guildConfig.progress?.customGoals?.voice)
  };
  const customGoalCount = Object.values(customGoals).filter(Boolean).length;
  return {
    live,
    boosts,
    roleCount,
    channelCount,
    modules,
    completedModules,
    completionPercent,
    setupTier,
    configuredLevels,
    securityEnabled,
    rolePanelCount,
    growthMilestones,
    boostMilestones,
    voiceMilestones,
    unlockedGrowth,
    unlockedBoosts,
    unlockedVoice,
    nextGrowth,
    nextBoost,
    nextVoice,
    customGoals,
    customGoalCount
  };
}

function createServerProgressEmbed(guildConfig, guild) {
  const snapshot = computeServerProgressSnapshot(guild, guildConfig);
  const progress = guildConfig?.progress || {};
  const reward = progress.memberMilestoneReward || {};
  const rewardInterval = Math.max(1, Number(reward.interval) || 100);
  const nextRewardTarget = getNextMemberRewardTarget(snapshot.live.members, rewardInterval);

  const lines = [
    `*Membres :* **${formatStatNumber(snapshot.live.members)}**`,
    `*En ligne :* **${formatStatNumber(snapshot.live.online)}**`,
    `*En vocal :* **${formatStatNumber(snapshot.live.voice)}**`,
    `*En stream :* **${formatStatNumber(snapshot.live.streaming)}**`,
    `*Boost :* **${formatStatNumber(snapshot.boosts)}**`
  ];

  if (reward.enabled && reward.roleId) {
    lines.push('');
    lines.push(`*Prochain palier :* **${formatStatNumber(nextRewardTarget)}**`);
    lines.push(`*Rôle palier :* <@&${reward.roleId}>`);
  }

  const embed = baseEmbed(guildConfig, getServerTrophyTitle(guildConfig, guild), lines.join('\n'));
  const trophyImage = getServerTrophyImage(guildConfig, guild);
  if (trophyImage) embed.setThumbnail(trophyImage);

  return embed
    .setFooter({ text: `${guild?.name || 'Server'} • Trophy board` })
    .setTimestamp();
}

function createServerProgressComponents() {
  return [];
}

function createDashboardEmbed(guildConfig, guild, page = 'home') {
  const g = guildConfig || {};
  const pages = ['home', 'setup', 'logs', 'security', 'voice', 'progress'];
  const safePage = pages.includes(page) ? page : 'home';
  const memberCount = guild?.memberCount || guild?.members?.cache?.size || 0;
  const boostCount = guild?.premiumSubscriptionCount || 0;
  const onlineCount = guild?.presences?.cache ? guild.presences.cache.filter((presence) => presence?.status && presence.status !== 'offline').size : 0;
  const voiceCount = guild?.voiceStates?.cache ? guild.voiceStates.cache.filter((state) => state?.channelId && !state?.member?.user?.bot).size : 0;
  const snapshot = computeServerProgressSnapshot(guild, g);
  const logsRoutes = Object.values(g.logs?.channels || {}).filter(Boolean).length;
  const stickyCount = Object.keys(g.sticky || {}).length;
  const missingCore = [];
  if (!(g.logs?.enabled && (g.logs?.channelId || g.logs?.channels?.default || logsRoutes))) missingCore.push('Logs');
  if (!(g.welcome?.enabled && g.welcome?.channelId)) missingCore.push('Welcome');
  if (!(g.support?.enabled && g.support?.channelId)) missingCore.push('Support');
  if (!(g.stats?.enabled && Object.values(g.stats?.channels || {}).some(Boolean))) missingCore.push('Stats');
  if (!(g.progress?.enabled && g.progress?.channelId)) missingCore.push('Trophy board');
  const embed = baseEmbed(g, '🧩 DvL Dashboard', 'Overview panel for the server setup and live modules.');

  if (safePage === 'home') {
    embed
      .setDescription('Tout l’essentiel au même endroit. Utilise les boutons dessous pour changer de page.')
      .addFields(
        {
          name: 'Server pulse',
          value: [
            `**Members:** ${formatStatNumber(memberCount)}`,
            `**Online:** ${formatStatNumber(onlineCount)}`,
            `**In voice:** ${formatStatNumber(voiceCount)}`,
            `**Boosts:** ${formatStatNumber(boostCount)}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Setup score',
          value: [
            `**Tier:** ${snapshot.setupTier}`,
            `**Completion:** ${snapshot.completionPercent}%`,
            `**Modules:** ${snapshot.completedModules}/${snapshot.modules.length}`,
            `**Security:** ${snapshot.securityEnabled} active`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Fast start',
          value: [
            '`+dashboard setup`',
            '`+logs`',
            '`+statssetup`',
            '`+trophychannel here`',
            '`+setupcheck`'
          ].join(' • '),
          inline: false
        },
        {
          name: 'Missing core pieces',
          value: missingCore.length ? missingCore.map((item) => `• ${item}`).join('\n') : 'Core setup is in good shape ✅',
          inline: false
        }
      );
  }

  if (safePage === 'setup') {
    embed
      .setTitle('🧩 DvL Dashboard • Setup')
      .setDescription('Vue pratique pour savoir quoi configurer ensuite sans se perdre dans toutes les commandes.')
      .addFields(
        {
          name: 'Core',
          value: [
            `**Prefix:** \`${g.prefix || '+'}\``,
            `**Embed color:** \`${g.embedColor || '#5865F2'}\``,
            `**Language:** \`${g.language || 'en'}\``,
            `**Backups:** ${Array.isArray(g.backups) ? g.backups.length : 0}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Main modules',
          value: [
            `**Welcome:** ${g.welcome?.enabled ? 'on' : 'off'}`,
            `**Leave:** ${g.leave?.enabled ? 'on' : 'off'}`,
            `**Support:** ${g.support?.enabled ? 'on' : 'off'}`,
            `**Sticky messages:** ${stickyCount}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Recommended next actions',
          value: [
            '`+setwelcomechannel #channel`',
            '`+setlogchannel #logs`',
            '`+setsupportchannel #support`',
            '`+stickyset <message>`',
            '`+backup create`'
          ].join('\n'),
          inline: false
        }
      );
  }

  if (safePage === 'logs') {
    embed
      .setTitle('🧾 DvL Dashboard • Logs')
      .setDescription('Résumé des routes de logs et du routing actuel.')
      .addFields(
        {
          name: 'Master',
          value: [
            `**Logs enabled:** ${g.logs?.enabled ? 'on' : 'off'}`,
            `**Default:** ${g.logs?.channels?.default ? `<#${g.logs.channels.default}>` : (g.logs?.channelId ? `<#${g.logs.channelId}>` : 'not set')}`,
            `**Routed families:** ${logsRoutes}`,
            `**Boost channel:** ${g.boost?.channelId ? `<#${g.boost.channelId}>` : 'not set'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Families',
          value: [
            `**Messages:** ${g.logs?.channels?.messages ? `<#${g.logs.channels.messages}>` : 'default'}`,
            `**Members:** ${g.logs?.channels?.members ? `<#${g.logs.channels.members}>` : 'default'}`,
            `**Moderation:** ${g.logs?.channels?.moderation ? `<#${g.logs.channels.moderation}>` : 'default'}`,
            `**Voice:** ${g.logs?.channels?.voice ? `<#${g.logs.channels.voice}>` : 'default'}`,
            `**Server:** ${g.logs?.channels?.server ? `<#${g.logs.channels.server}>` : 'default'}`,
            `**Social:** ${g.logs?.channels?.social ? `<#${g.logs.channels.social}>` : 'default'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Useful commands',
          value: '`+logs` • `+setlogchannel messages #channel` • `+setlogchannel moderation #channel` • `+boostconfig`',
          inline: false
        }
      );
  }

  if (safePage === 'security') {
    const mod = g.automod || {};
    embed
      .setTitle('🚨 DvL Dashboard • Security')
      .setDescription('Security / AutoMod view with the current thresholds and actions.')
      .addFields(
        { name: 'Filters', value: [
          `**Anti-spam:** ${automodRuleLabel(mod.antiSpam)}`,
          `**Anti-link:** ${automodRuleLabel(mod.antiLink)}`,
          `**Anti-invite:** ${automodRuleLabel(mod.antiInvite)}`,
          `**Ghost ping:** **${mod.ghostPing?.enabled ? 'on' : 'off'}**${mod.ghostPing?.channelId ? ` • <#${mod.ghostPing.channelId}>` : ''}`
        ].join('\n'), inline: false },
        { name: 'Abuse protection', value: [
          `**Mention spam:** ${automodRuleLabel(mod.antiMention)}`,
          `**Caps:** ${automodRuleLabel(mod.antiCaps)}`,
          `**Emoji spam:** ${automodRuleLabel(mod.antiEmojiSpam)}`,
          `**Raid mode:** ${automodRuleLabel(mod.raidMode, 'delete')}`,
          `**Blocked words:** **${mod.badWordsEnabled ? 'on' : 'off'}** • ${mod.badWords?.length || 0} word(s)`
        ].join('\n'), inline: false },
        { name: 'Useful commands', value: '`+securitypreset balanced` • `+setantispam 6 6 timeout` • `+setantimention 5 delete` • `+ghostping test` • `+automodignore #channel`', inline: false }
      );
  }

  if (safePage === 'voice') {
    const temp = g.voice?.temp || {};
    const moderation = g.voice?.moderation || {};
    embed
      .setTitle('🔊 DvL Dashboard • Voice')
      .setDescription('Voice system, temp voice and voice moderation overview.')
      .addFields(
        { name: 'Temp voice', value: [
          `**Hub:** ${temp.hubChannelId ? `<#${temp.hubChannelId}>` : 'not set'}`,
          `**Panel:** ${temp.panelChannelId ? `<#${temp.panelChannelId}>` : 'not set'}`,
          `**Category:** ${temp.hubCategoryId ? `<#${temp.hubCategoryId}>` : 'not set'}`,
          `**Default limit:** ${temp.defaultLimit || 0}`
        ].join('\n'), inline: true },
        { name: 'Voice moderation', value: [
          `**Mute role:** ${moderation.muteRoleId ? `<@&${moderation.muteRoleId}>` : 'not set'}`,
          `**Ban role:** ${moderation.banRoleId ? `<@&${moderation.banRoleId}>` : 'not set'}`,
          `**Stats panel:** ${g.stats?.enabled ? 'on' : 'off'}`,
          `**Current voice users:** ${formatStatNumber(voiceCount)}`
        ].join('\n'), inline: true },
        { name: 'Useful commands', value: '`+voicepanel` • `+createvoc` • `+setvoicemuterole @role` • `+setvoicebanrole @role` • `+statssetup`', inline: false }
      );
  }

  if (safePage === 'progress') {
    embed
      .setTitle('🏆 DvL Dashboard • Progress')
      .setDescription('Progression, trophies, objectifs personnalisés et module completion.')
      .addFields(
        { name: 'Progress', value: [
          `**Setup completion:** ${snapshot.completionPercent}%`,
          `**Completed modules:** ${snapshot.completedModules}/${snapshot.modules.length}`,
          `**Member trophies:** ${snapshot.unlockedGrowth}/${snapshot.growthMilestones.length}`,
          `**Boost trophies:** ${snapshot.unlockedBoosts}/${snapshot.boostMilestones.length}`,
          `**Voice trophies:** ${snapshot.unlockedVoice}/${snapshot.voiceMilestones.length}`
        ].join('\n'), inline: true },
        { name: 'Board', value: [
          `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}`,
          `**Channel:** ${g.progress?.channelId ? `<#${g.progress.channelId}>` : 'not set'}`,
          `**Custom goals:** ${snapshot.customGoalCount}`,
          `**Next members trophy:** ${snapshot.nextGrowth || 'done'}`,
          `**Next boost trophy:** ${snapshot.nextBoost || 'done'}`,
          `**Next voice trophy:** ${snapshot.nextVoice || 'done'}`
        ].join('\n'), inline: true },
        { name: 'Goal shortcuts', value: '`+trophygoal members 500` • `+trophygoal boosts 14` • `+trophygoal voice 50` • `+trophyconfig`', inline: false }
      );
  }

  return embed.setFooter({ text: `DvL • dashboard • page: ${safePage}` });
}

function createDashboardComponents(current = 'home') {
  const pages = ['home', 'setup', 'logs', 'security', 'voice', 'progress'];
  const safePage = pages.includes(current) ? current : 'home';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard:home').setLabel('Home').setEmoji('🏠').setStyle(safePage === 'home' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboard:setup').setLabel('Setup').setEmoji('🧩').setStyle(safePage === 'setup' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:logs').setLabel('Logs').setEmoji('🧾').setStyle(safePage === 'logs' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:security').setLabel('Security').setEmoji('🚨').setStyle(safePage === 'security' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:voice').setLabel('Voice').setEmoji('🔊').setStyle(safePage === 'voice' ? ButtonStyle.Success : ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard:progress').setLabel('Progress').setEmoji('🏆').setStyle(safePage === 'progress' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`dashboardquick:refresh:${safePage}`).setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboardquick:help').setLabel('Help').setEmoji('📂').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboardquick:logs').setLabel('Logs panel').setEmoji('📋').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboardquick:progress').setLabel('Trophy').setEmoji('🥇').setStyle(ButtonStyle.Primary)
    )
  ];
}

function createSetupCheckEmbed(guildConfig, guild) {
  const me = guild?.members?.me;
  const perms = me?.permissions;
  const checks = [
    ['Manage Roles', perms?.has(PermissionFlagsBits.ManageRoles), 'roles / voice moderation / autoroles'],
    ['Manage Channels', perms?.has(PermissionFlagsBits.ManageChannels), 'stats / temp voice / setup panels'],
    ['Moderate Members', perms?.has(PermissionFlagsBits.ModerateMembers), 'timeouts / anti-spam punish'],
    ['Manage Messages', perms?.has(PermissionFlagsBits.ManageMessages), 'ghost ping / cleanup / sticky'],
    ['Move Members', perms?.has(PermissionFlagsBits.MoveMembers), 'move / pull / temp voice'],
    ['Mute Members', perms?.has(PermissionFlagsBits.MuteMembers), 'voice mute'],
    ['Deafen Members', perms?.has(PermissionFlagsBits.DeafenMembers), 'voice control'],
    ['View Audit Log', perms?.has(PermissionFlagsBits.ViewAuditLog), 'cleaner logs context']
  ];
  const okCount = checks.filter(([, ok]) => ok).length;
  const score = Math.round((okCount / Math.max(1, checks.length)) * 100);
  const recommendations = [];
  if (!(guildConfig.logs?.enabled && (guildConfig.logs?.channelId || guildConfig.logs?.channels?.default || Object.values(guildConfig.logs?.channels || {}).some(Boolean)))) recommendations.push('Set logs with `+setlogchannel #logs`');
  if (!(guildConfig.automod?.ghostPing?.enabled)) recommendations.push('Enable ghostping with `+ghostping on`');
  if (!(guildConfig.stats?.enabled)) recommendations.push('Create server stats with `+statssetup`');
  if (!(guildConfig.progress?.enabled)) recommendations.push('Create the trophy board with `+trophychannel here`');
  if (!(guildConfig.voice?.moderation?.muteRoleId || guildConfig.voice?.moderation?.banRoleId)) recommendations.push('Configure voice roles with `+setvoicemuterole` and `+setvoicebanrole`');
  return baseEmbed(guildConfig, '🩺 Setup health check', [
    `**Bot readiness:** ${score}%`,
    makeMiniProgressBar(score),
    `**Permissions OK:** ${okCount}/${checks.length}`,
    `**Setup tier:** ${computeServerProgressSnapshot(guild, guildConfig).setupTier}`
  ].join('\n')).addFields(
    {
      name: 'Critical permissions',
      value: checks.map(([name, ok, why]) => `${ok ? '✅' : '❌'} **${name}** — ${why}`).join('\n').slice(0, 1024),
      inline: false
    },
    {
      name: 'Recommended next steps',
      value: recommendations.length ? recommendations.map((line) => `• ${line}`).join('\n').slice(0, 1024) : 'No major issue detected ✅',
      inline: false
    }
  );
}

function createDashboardEmbed(guildConfig, guild, page = 'home') {
  const g = guildConfig || {};
  const safePage = ['home', 'security', 'voice', 'progress'].includes(page) ? page : 'home';
  const memberCount = guild?.memberCount || guild?.members?.cache?.size || 0;
  const boostCount = guild?.premiumSubscriptionCount || 0;
  const onlineCount = guild?.presences?.cache ? guild.presences.cache.filter((presence) => presence?.status && presence.status !== 'offline').size : 0;
  const voiceCount = guild?.voiceStates?.cache ? guild.voiceStates.cache.filter((state) => state?.channelId && !state?.member?.user?.bot).size : 0;
  const embed = baseEmbed(g, '🧩 DvL Dashboard', 'Overview panel for the server setup and live modules.');

  if (safePage === 'home') {
    embed
      .setDescription('Everything important in one clean panel. Use the buttons below to switch sections.')
      .addFields(
        {
          name: 'Server',
          value: [
            `**Members:** ${formatStatNumber(memberCount)}`,
            `**Online:** ${formatStatNumber(onlineCount)}`,
            `**In voice:** ${formatStatNumber(voiceCount)}`,
            `**Boosts:** ${formatStatNumber(boostCount)}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Core modules',
          value: [
            `**Logs:** ${g.logs?.enabled ? 'on' : 'off'}`,
            `**Welcome:** ${g.welcome?.enabled ? 'on' : 'off'}`,
            `**Support:** ${g.support?.enabled ? 'on' : 'off'}`,
            `**Stats:** ${g.stats?.enabled ? 'on' : 'off'}`,
            `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Quick setup',
          value: [
            '`+logs`',
            '`+statssetup`',
            '`+trophychannel here`',
            '`+automodconfig`',
            '`+voicepanel`',
            '`+stickyset <message>`'
          ].join(' • '),
          inline: false
        }
      );
  }

  if (safePage === 'security') {
    const mod = g.automod || {};
    embed
      .setTitle('🚨 DvL Dashboard • Security')
      .setDescription('Security / AutoMod view with the current thresholds and actions.')
      .addFields(
        { name: 'Filters', value: [
          `**Anti-spam:** ${automodRuleLabel(mod.antiSpam)}`,
          `**Anti-link:** ${automodRuleLabel(mod.antiLink)}`,
          `**Anti-invite:** ${automodRuleLabel(mod.antiInvite)}`,
          `**Ghost ping:** **${mod.ghostPing?.enabled ? 'on' : 'off'}**${mod.ghostPing?.channelId ? ` • <#${mod.ghostPing.channelId}>` : ''}`
        ].join('\n'), inline: false },
        { name: 'Abuse protection', value: [
          `**Mention spam:** ${automodRuleLabel(mod.antiMention)}`,
          `**Caps:** ${automodRuleLabel(mod.antiCaps)}`,
          `**Emoji spam:** ${automodRuleLabel(mod.antiEmojiSpam)}`,
          `**Raid mode:** ${automodRuleLabel(mod.raidMode, 'delete')}`,
          `**Blocked words:** **${mod.badWordsEnabled ? 'on' : 'off'}** • ${mod.badWords?.length || 0} word(s)`
        ].join('\n'), inline: false },
        { name: 'Useful commands', value: '`+securitypreset balanced` • `+setantispam 6 6 timeout` • `+setantimention 5 delete` • `+automodignore #channel`', inline: false }
      );
  }

  if (safePage === 'voice') {
    const temp = g.voice?.temp || {};
    const moderation = g.voice?.moderation || {};
    embed
      .setTitle('🔊 DvL Dashboard • Voice')
      .setDescription('Voice system, temp voice and voice moderation overview.')
      .addFields(
        { name: 'Temp voice', value: [
          `**Hub:** ${temp.hubChannelId ? `<#${temp.hubChannelId}>` : 'not set'}`,
          `**Panel:** ${temp.panelChannelId ? `<#${temp.panelChannelId}>` : 'not set'}`,
          `**Category:** ${temp.hubCategoryId ? `<#${temp.hubCategoryId}>` : 'not set'}`,
          `**Default limit:** ${temp.defaultLimit || 0}`
        ].join('\n'), inline: true },
        { name: 'Voice moderation', value: [
          `**Mute role:** ${moderation.muteRoleId ? `<@&${moderation.muteRoleId}>` : 'not set'}`,
          `**Ban role:** ${moderation.banRoleId ? `<@&${moderation.banRoleId}>` : 'not set'}`,
          `**Stats panel:** ${g.stats?.enabled ? 'on' : 'off'}`,
          `**Current voice users:** ${formatStatNumber(voiceCount)}`
        ].join('\n'), inline: true },
        { name: 'Useful commands', value: '`+voicepanel` • `+createvoc` • `+setvoicemuterole @role` • `+setvoicebanrole @role` • `+statssetup`', inline: false }
      );
  }

  if (safePage === 'progress') {
    const snapshot = computeServerProgressSnapshot(guild, g);
    embed
      .setTitle('🏆 DvL Dashboard • Progress')
      .setDescription('Progression, trophies and module completion.')
      .addFields(
        { name: 'Progress', value: [
          `**Setup completion:** ${snapshot.completionPercent}%`,
          `**Completed modules:** ${snapshot.completedModules}/${snapshot.modules.length}`,
          `**Member trophies:** ${snapshot.unlockedGrowth}/${snapshot.growthMilestones.length}`,
          `**Boost trophies:** ${snapshot.unlockedBoosts}/${snapshot.boostMilestones.length}`,
          `**Voice trophies:** ${snapshot.unlockedVoice}/${snapshot.voiceMilestones.length}`
        ].join('\n'), inline: true },
        { name: 'Board', value: [
          `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}`,
          `**Channel:** ${g.progress?.channelId ? `<#${g.progress.channelId}>` : 'not set'}`,
          `**Next members trophy:** ${snapshot.nextGrowth || 'done'}`,
          `**Next boost trophy:** ${snapshot.nextBoost || 'done'}`,
          `**Next voice trophy:** ${snapshot.nextVoice || 'done'}`,
          `**Reward next:** ${snapshot.memberMilestoneReward?.enabled && snapshot.memberMilestoneReward?.roleId ? `${formatStatNumber(snapshot.nextMemberRewardAt)} → <@&${snapshot.memberMilestoneReward.roleId}>` : 'off'}`
        ].join('\n'), inline: true },
        { name: 'Useful commands', value: '`+trophy` • `+trophychannel here` • `+trophyimage <url>` • `+milestonerole @role` • `+milestoneinterval 100`', inline: false }
      );
  }

  return embed.setFooter({ text: `DvL • dashboard • page: ${safePage}` });
}

function createDashboardComponents(current = 'home') {
  const safePage = ['home', 'security', 'voice', 'progress'].includes(current) ? current : 'home';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard:home').setLabel('Home').setEmoji('🏠').setStyle(safePage === 'home' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboard:security').setLabel('Security').setEmoji('🚨').setStyle(safePage === 'security' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:voice').setLabel('Voice').setEmoji('🔊').setStyle(safePage === 'voice' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:progress').setLabel('Progress').setEmoji('🏆').setStyle(safePage === 'progress' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:Categories:1').setLabel('Help').setEmoji('📂').setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function getConfigurableRole(ctx, roleId) {
  if (!ctx?.guild || !roleId) return null;
  return ctx.guild.roles.cache.get(roleId) || await ctx.guild.roles.fetch(roleId).catch(() => null);
}

function canBotManageRoleInGuild(guild, role) {
  const me = guild?.members?.me;
  if (!guild || !role || !me) return false;
  return me.permissions.has(PermissionFlagsBits.ManageRoles) && role.position < me.roles.highest.position;
}

const SECURITY_TOGGLES = [
  ['antispam', 'Toggle anti-spam', 'automod.antiSpam.enabled', ['spamguard']],
  ['antilink', 'Toggle anti-link', 'automod.antiLink.enabled', ['links']],
  ['antiinvite', 'Toggle anti-invite', 'automod.antiInvite.enabled', ['noinvite']],
  ['antimention', 'Toggle anti-mention spam', 'automod.antiMention.enabled', ['mentionguard']],
  ['anticaps', 'Toggle anti-caps', 'automod.antiCaps.enabled', ['capsguard']],
  ['antiemoji', 'Toggle anti-emoji spam', 'automod.antiEmojiSpam.enabled', ['emojiguard']],
  ['raidmode', 'Toggle raid mode', 'automod.raidMode.enabled', ['joinlock']]
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function serializeRole(role, guild) {
  if (!role || role.id === guild?.id || role.managed) return null;
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.bitfield.toString(),
    position: role.position
  };
}

function serializeChannel(channel) {
  if (!channel || channel.isThread?.()) return null;
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: channel.position || 0,
    topic: channel.topic || null,
    nsfw: Boolean(channel.nsfw),
    rateLimitPerUser: channel.rateLimitPerUser || 0,
    bitrate: channel.bitrate || null,
    userLimit: channel.userLimit || null
  };
}

function buildGuildBackupSnapshot(guildConfig, guild) {
  const snapshot = cloneJson({
    prefix: guildConfig.prefix,
    embedColor: guildConfig.embedColor,
    language: guildConfig.language,
    welcome: guildConfig.welcome,
    leave: guildConfig.leave,
    boost: guildConfig.boost,
    logs: guildConfig.logs,
    automod: guildConfig.automod,
    roles: guildConfig.roles,
    permissions: guildConfig.permissions,
    support: guildConfig.support,
    invites: {
      stats: guildConfig.invites?.stats || {}
    },
    tiktok: guildConfig.tiktok,
    voice: guildConfig.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null } },
    sticky: guildConfig.sticky || {},
    server: {
      name: guild?.name || null,
      iconURL: guild?.iconURL?.({ extension: 'png', size: 512 }) || null
    },
    structure: {
      roles: (guild?.roles?.cache ? [...guild.roles.cache.values()] : [])
        .map((role) => serializeRole(role, guild))
        .filter(Boolean)
        .sort((a, b) => a.position - b.position),
      channels: (guild?.channels?.cache ? [...guild.channels.cache.values()] : [])
        .map((channel) => serializeChannel(channel))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return -1;
          if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return 1;
          return (a.position || 0) - (b.position || 0);
        })
    },
    refNames: {
      channels: Object.fromEntries((guild?.channels?.cache ? [...guild.channels.cache.values()] : []).map((channel) => [channel.id, channel.name])),
      roles: Object.fromEntries((guild?.roles?.cache ? [...guild.roles.cache.values()] : []).map((role) => [role.id, role.name]))
    }
  });

  if (snapshot.roles?.rolePanels) snapshot.roles.rolePanels = {};
  if (snapshot.roles?.reactionRoles) snapshot.roles.reactionRoles = {};

  return {
    snapshot,
    meta: {
      roles: Math.max(0, (guild?.roles?.cache?.size || 1) - 1),
      channels: guild?.channels?.cache?.size || 0,
      members: guild?.memberCount || guild?.members?.cache?.size || 0,
      backupVersion: 2
    }
  };
}

async function resolveBackupAttachment(ctx) {
  if (ctx.interaction) return null;
  const direct = [...(ctx.message?.attachments?.values?.() || [])][0] || null;
  if (direct) return direct;
  if (ctx.message?.reference?.messageId) {
    const ref = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
    return ref ? ([...ref.attachments.values()][0] || null) : null;
  }
  return null;
}

function getGlobalBackups(store) {
  return Array.isArray(store.getGlobal().backups) ? store.getGlobal().backups : [];
}

function saveGlobalBackups(store, mutator) {
  return store.updateGlobal((global) => {
    global.backups = Array.isArray(global.backups) ? global.backups : [];
    const next = mutator(global.backups.slice()) || global.backups;
    global.backups = next.slice(0, 50);
    return global;
  });
}

function extractMessageIdFromInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const link = value.match(/discord\.com\/channels\/\d+\/\d+\/(\d{17,20})/i);
  if (link) return link[1];
  const digits = value.replace(/\D/g, '');
  return /^\d{17,20}$/.test(digits) ? digits : null;
}

async function resolveSupportTargetUser(ctx, raw) {
  if (!raw && !ctx.message?.reference?.messageId) return null;
  if (ctx.message?.reference?.messageId) {
    const route = ctx.client.supportMessageLinks.get(ctx.message.reference.messageId);
    if (route?.userId) {
      const fromReply = await ctx.client.users.fetch(route.userId).catch(() => null);
      if (fromReply) return fromReply;
    }
  }
  if (!raw) return null;
  const mention = ctx.message?.mentions?.users?.first?.() || null;
  if (mention) return mention;
  const userId = extractMessageIdFromInput(raw);
  if (!userId) return null;
  return ctx.client.users.fetch(userId).catch(() => null);
}

function getCommandAttachments(ctx) {
  if (ctx.interaction || !ctx.message) return [];
  return [...(ctx.message.attachments?.values?.() || [])];
}

function getCommandAttachmentUrls(ctx) {
  return getCommandAttachments(ctx).map((attachment) => attachment.url).filter(Boolean);
}

function getCommandFiles(ctx) {
  return getCommandAttachments(ctx).slice(0, 10).map((attachment, index) => ({
    attachment: attachment.url,
    name: attachment.name || `attachment-${index + 1}`
  }));
}

function getCommandImageUrl(ctx) {
  const imageAttachment = getCommandAttachments(ctx).find((attachment) => String(attachment.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(attachment.name || attachment.url || '')));
  return imageAttachment?.url || null;
}

function getSortedGiveaways(giveaways) {
  return Object.values(giveaways || {}).sort((a, b) => {
    const aTime = a?.createdAt || a?.endsAt || 0;
    const bTime = b?.createdAt || b?.endsAt || 0;
    return bTime - aTime;
  });
}

function getGiveawayState(giveaway) {
  if (!giveaway) return 'missing';
  if (giveaway.ended) return 'ended';
  if (giveaway.paused) return 'paused';
  return 'active';
}

function getGiveawayStateLabel(giveaway) {
  const state = getGiveawayState(giveaway);
  if (state === 'active') return 'active';
  if (state === 'paused') return 'paused';
  if (state === 'ended') return 'ended';
  return 'missing';
}

function getGiveawayStateEmoji(giveaway) {
  const state = getGiveawayState(giveaway);
  if (state === 'active') return '🟢';
  if (state === 'paused') return '🟡';
  if (state === 'ended') return '🔴';
  return '⚪';
}

function formatGiveawayWhen(giveaway) {
  if (!giveaway) return 'unknown';
  if (giveaway.paused && giveaway.pauseRemaining != null) return `paused with **${formatDuration(giveaway.pauseRemaining)}** left`;
  if (giveaway.ended) return 'already ended';
  return `<t:${Math.floor((giveaway.endsAt || Date.now()) / 1000)}:R>`;
}

function buildGiveawayInfoLines(giveaway) {
  const participants = [...new Set(giveaway?.participants || [])];
  return [
    `**Prize:** ${giveaway?.prize || 'Unknown'}`,
    `**State:** ${getGiveawayStateEmoji(giveaway)} ${getGiveawayStateLabel(giveaway)}`,
    `**Winners:** ${giveaway?.winners || 1}`,
    `**Participants:** ${participants.length}`,
    `**Ends / status:** ${formatGiveawayWhen(giveaway)}`,
    `**Host:** ${giveaway?.hostId ? `<@${giveaway.hostId}>` : 'Unknown'}`,
    `**ID:** \`${giveaway?.id || 'unknown'}\``,
    `**Message ID:** \`${giveaway?.messageId || 'none'}\``,
    giveaway?.messageUrl ? `**Message:** [open giveaway](${giveaway.messageUrl})` : null,
    giveaway?.lastWinnerIds?.length ? `**Last winner(s):** ${giveaway.lastWinnerIds.map((winnerId) => `<@${winnerId}>`).join(', ')}` : null
  ].filter(Boolean);
}

async function resolveGiveawayEntry(ctx, rawInput) {
  const giveaways = ctx.guildConfig.giveaways || {};
  let raw = String(rawInput || '').trim();
  if (!raw && ctx.message?.reference?.messageId) raw = ctx.message.reference.messageId;
  const entries = getSortedGiveaways(giveaways);
  if (!raw) return { id: null, giveaway: null };
  if (['latest', 'last', 'recent', 'newest'].includes(raw.toLowerCase())) {
    return entries[0] ? { id: entries[0].id, giveaway: entries[0] } : { id: raw, giveaway: null };
  }
  if (giveaways[raw]) return { id: raw, giveaway: giveaways[raw] };
  const messageId = extractMessageIdFromInput(raw);
  if (messageId) {
    const foundByMessage = entries.find((entry) => entry?.messageId === messageId || entry?.id === messageId);
    if (foundByMessage) return { id: foundByMessage.id, giveaway: foundByMessage };
  }
  const normalized = raw.toLowerCase();
  const exact = entries.find((entry) => String(entry?.id || '').toLowerCase() === normalized || String(entry?.prize || '').toLowerCase() === normalized);
  if (exact) return { id: exact.id, giveaway: exact };
  const fuzzy = entries.find((entry) => String(entry?.id || '').toLowerCase().includes(normalized)
    || String(entry?.prize || '').toLowerCase().includes(normalized)
    || String(entry?.messageId || '').toLowerCase().includes(normalized));
  return fuzzy ? { id: fuzzy.id, giveaway: fuzzy } : { id: raw, giveaway: null };
}

function normalizeRoleScope(value) {
  const raw = String(value || '').toLowerCase();
  if (['all', 'everyone'].includes(raw)) return 'all';
  if (['humans', 'human', 'members', 'users', 'people'].includes(raw)) return 'humans';
  if (['bots', 'bot'].includes(raw)) return 'bots';
  return null;
}

async function runMassRoleAction(ctx, action, role, scope = 'all') {
  const me = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { error: 'I need **Manage Roles** to do that.' };
  }
  if (role.managed || role.id === ctx.guild.id) {
    return { error: 'That role cannot be mass managed.' };
  }
  if (role.position >= me.roles.highest.position) {
    return { error: 'Move the target role below my highest role first.' };
  }
  if (ctx.member && role.position >= ctx.member.roles.highest.position && ctx.guild.ownerId !== ctx.user.id) {
    return { error: 'That role is above or equal to your highest role.' };
  }

  await ctx.guild.members.fetch().catch(() => null);
  const canTouchTarget = (target) => {
    if (!target) return false;
    if (target.id === me.id) return false;
    if (target.user.bot && scope === 'humans') return false;
    if (!target.user.bot && scope === 'bots') return false;
    if (target.id === ctx.guild.ownerId && ctx.user.id !== ctx.guild.ownerId) return false;
    if (target.id !== ctx.user.id && ctx.guild.ownerId !== ctx.user.id && target.roles.highest.position >= ctx.member.roles.highest.position) return false;
    if (target.roles.highest.position >= me.roles.highest.position) return false;
    return true;
  };

  const members = [...ctx.guild.members.cache.values()].filter(canTouchTarget);
  const todo = members.filter((target) => action === 'add' ? !target.roles.cache.has(role.id) : target.roles.cache.has(role.id));
  let changed = 0;
  let failed = 0;
  for (const target of todo) {
    const ok = await (action === 'add'
      ? target.roles.add(role, `DvL roleall ${action} by ${ctx.user.tag}`)
      : target.roles.remove(role, `DvL roleall ${action} by ${ctx.user.tag}`)
    ).then(() => true).catch(() => false);
    if (ok) changed += 1;
    else failed += 1;
  }
  const skipped = Math.max(0, members.length - todo.length);
  return {
    action,
    role,
    scope,
    members,
    changed,
    failed,
    skipped
  };
}

function resolveGlobalBackupEntry(backups, rawInput) {
  const raw = String(rawInput || '').trim().toLowerCase();
  if (!backups.length) return null;
  if (!raw || ['latest', 'last', 'recent', 'newest'].includes(raw)) return backups[0];
  const exact = backups.find((entry) => String(entry.id || '').toLowerCase() === raw || String(entry.name || '').toLowerCase() === raw);
  if (exact) return exact;
  return backups.find((entry) => String(entry.name || '').toLowerCase().includes(raw) || String(entry.sourceGuildName || '').toLowerCase().includes(raw) || String(entry.id || '').toLowerCase().includes(raw)) || null;
}

function remapSnapshotIds(snapshot, roleMapByName = new Map(), channelMapByName = new Map()) {
  const cloned = cloneJson(snapshot || {});
  const roleNameByOldId = cloned.refNames?.roles || {};
  const channelNameByOldId = cloned.refNames?.channels || {};
  const mapRoleId = (oldId) => {
    if (!oldId) return null;
    const name = roleNameByOldId[oldId];
    return name ? (roleMapByName.get(name)?.id || null) : null;
  };
  const mapChannelId = (oldId) => {
    if (!oldId) return null;
    const name = channelNameByOldId[oldId];
    return name ? (channelMapByName.get(name)?.id || null) : null;
  };

  if (cloned.welcome) cloned.welcome.channelId = mapChannelId(cloned.welcome.channelId);
  if (cloned.leave) cloned.leave.channelId = mapChannelId(cloned.leave.channelId);
  if (cloned.boost) cloned.boost.channelId = mapChannelId(cloned.boost.channelId);
  if (cloned.logs) cloned.logs.channelId = mapChannelId(cloned.logs.channelId);
  if (cloned.support) {
    cloned.support.channelId = mapChannelId(cloned.support.channelId);
    cloned.support.pingRoleId = mapRoleId(cloned.support.pingRoleId);
  }
  if (cloned.roles) {
    cloned.roles.autoRoles = (cloned.roles.autoRoles || []).map(mapRoleId).filter(Boolean);
    if (cloned.roles.statusRole) cloned.roles.statusRole.roleId = mapRoleId(cloned.roles.statusRole.roleId);
    cloned.roles.rolePanels = {};
    cloned.roles.reactionRoles = {};
  }
  if (cloned.permissions?.levels) {
    for (const level of Object.values(cloned.permissions.levels)) level.roleId = mapRoleId(level.roleId);
  }
  if (cloned.automod) cloned.automod.whitelistRoleIds = (cloned.automod.whitelistRoleIds || []).map(mapRoleId).filter(Boolean);
  if (cloned.tiktok?.watchers) {
    cloned.tiktok.watchers = cloned.tiktok.watchers.map((watcher) => ({
      ...watcher,
      channelId: mapChannelId(watcher.channelId),
      mentionRoleId: mapRoleId(watcher.mentionRoleId),
      lastError: null
    })).filter((watcher) => watcher.channelId);
  }
  if (cloned.voice?.temp) {
    cloned.voice.temp.channels = {};
    const panels = cloned.voice.temp.panels || {};
    for (const panel of Object.values(panels)) {
      panel.channelId = mapChannelId(panel.channelId);
      panel.categoryId = mapChannelId(panel.categoryId);
    }
  }
  return cloned;
}

async function applyBackupStructure(guild, snapshot) {
  const createdRoles = new Map();
  const createdChannels = new Map();
  const structure = snapshot?.structure || {};

  if (snapshot?.server?.name) await guild.setName(String(snapshot.server.name).slice(0, 100)).catch(() => null);
  if (snapshot?.server?.iconURL) {
    try {
      const res = await axios.get(snapshot.server.iconURL, { responseType: 'arraybuffer', timeout: 20000 });
      await guild.setIcon(Buffer.from(res.data)).catch(() => null);
    } catch {}
  }

  const existingChannels = [...guild.channels.cache.values()].sort((a, b) => b.position - a.position);
  for (const channel of existingChannels) {
    if (channel.deletable) await channel.delete('DvL backup clean restore').catch(() => null);
  }

  const existingRoles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => a.position - b.position);
  for (const role of existingRoles) {
    if (role.editable) await role.delete('DvL backup clean restore').catch(() => null);
  }

  for (const roleData of (structure.roles || []).sort((a, b) => a.position - b.position)) {
    const role = await guild.roles.create({
      name: roleData.name,
      color: roleData.color || undefined,
      hoist: Boolean(roleData.hoist),
      mentionable: Boolean(roleData.mentionable),
      permissions: BigInt(roleData.permissions || '0'),
      reason: 'DvL backup restore'
    }).catch(() => null);
    if (role) createdRoles.set(roleData.name, role);
  }

  const categories = (structure.channels || []).filter((entry) => entry.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
  for (const data of categories) {
    const channel = await guild.channels.create({ name: data.name, type: data.type, reason: 'DvL backup restore' }).catch(() => null);
    if (channel) createdChannels.set(data.name, channel);
  }

  const nonCategories = (structure.channels || []).filter((entry) => entry.type !== ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
  for (const data of nonCategories) {
    const parentName = snapshot.refNames?.channels?.[data.parentId] || null;
    const parent = parentName ? createdChannels.get(parentName) : null;
    const createData = {
      name: data.name,
      type: data.type,
      parent: parent?.id || null,
      reason: 'DvL backup restore'
    };
    if (typeof data.topic === 'string') createData.topic = data.topic;
    if (typeof data.nsfw === 'boolean') createData.nsfw = data.nsfw;
    if (typeof data.rateLimitPerUser === 'number') createData.rateLimitPerUser = data.rateLimitPerUser;
    if (typeof data.bitrate === 'number' && data.bitrate > 0) createData.bitrate = data.bitrate;
    if (typeof data.userLimit === 'number' && data.userLimit >= 0) createData.userLimit = data.userLimit;
    const channel = await guild.channels.create(createData).catch(() => null);
    if (channel) createdChannels.set(data.name, channel);
  }

  return { createdRoles, createdChannels };
}

function addCommonSlashMeta(builder, command) {
  if (command.userPermissions?.length) {
    const bitfield = command.userPermissions.reduce((acc, perm) => acc | BigInt(perm), 0n);
    builder.setDefaultMemberPermissions(bitfield);
  }
  builder.setDMPermission(Boolean(command.dmAllowed));
  return builder;
}

function addOption(builder, option) {
  const map = {
    string: 'addStringOption',
    integer: 'addIntegerOption',
    number: 'addNumberOption',
    boolean: 'addBooleanOption',
    user: 'addUserOption',
    channel: 'addChannelOption',
    role: 'addRoleOption'
  };
  const method = map[option.type];
  if (!method) return builder;
  builder[method]((opt) => {
    opt.setName(option.name).setDescription(option.description || 'Option').setRequired(Boolean(option.required));
    if (option.channelTypes && option.type === 'channel') opt.addChannelTypes(...option.channelTypes);
    if (option.choices) opt.addChoices(...option.choices.map((choice) => ({ name: choice.name, value: choice.value })));
    if (typeof option.minValue !== 'undefined' && (option.type === 'integer' || option.type === 'number')) opt.setMinValue(option.minValue);
    if (typeof option.maxValue !== 'undefined' && (option.type === 'integer' || option.type === 'number')) opt.setMaxValue(option.maxValue);
    return opt;
  });
  return builder;
}

function makeSimpleCommand(command) {
  command.aliases = command.aliases || [];
  return command;
}

function buildWelcomeModuleEmbed(guildConfig, prefix = '+') {
  const welcome = guildConfig.welcome || {};
  const embed = baseEmbed(guildConfig, '👋 Welcome module', 'Welcome messages with clear control over channel, style and preview.');
  embed.addFields(
    {
      name: 'Current state',
      value: [
        `**Status:** ${welcome.enabled ? 'on' : 'off'}`,
        `**Channel:** ${welcome.channelId ? `<#${welcome.channelId}>` : 'not set'}`,
        `**Message:** ${formatTemplatePreview(welcome.message)}`,
        ...buildAnnouncementStyleLines(guildConfig, welcome)
      ].join('\n').slice(0, 1024),
      inline: false
    },
    {
      name: 'What you can change',
      value: [
        `• on / off`,
        `• channel`,
        `• mode embed/plain`,
        `• title / message / footer`,
        `• color / image`,
        `• reset / test / vars`
      ].join('\n'),
      inline: true
    },
    {
      name: 'Quick setup',
      value: [
        `\`${prefix}welcome on\``,
        `\`${prefix}welcome channel #welcome\``,
        `\`${prefix}welcome mode embed\``,
        `\`${prefix}welcome message Bienvenue {user} sur {server}\``
      ].join('\n'),
      inline: true
    },
    {
      name: 'Advanced style',
      value: [
        `\`${prefix}welcome title 👋 Bienvenue\``,
        `\`${prefix}welcome footer Profite bien du serveur\``,
        `\`${prefix}welcome color #00D26A\``,
        `\`${prefix}welcome image https://...\``
      ].join('\n'),
      inline: false
    },
    {
      name: 'Checks',
      value: `\`${prefix}welcome vars\` • \`${prefix}welcome example\` • \`${prefix}welcome test\` • \`${prefix}welcome reset\``,
      inline: false
    }
  );
  return embed;
}
function buildLeaveModuleEmbed(guildConfig, prefix = '+') {
  const leave = guildConfig.leave || {};
  const embed = baseEmbed(guildConfig, '👋 Leave module', 'Leave logs and leave DMs with separate style controls.');
  embed.addFields(
    {
      name: 'Server leave message',
      value: [
        `**Status:** ${leave.enabled ? 'on' : 'off'}`,
        `**Channel:** ${leave.channelId ? `<#${leave.channelId}>` : 'not set'}`,
        `**Message:** ${formatTemplatePreview(leave.message)}`,
        ...buildAnnouncementStyleLines(guildConfig, leave)
      ].join('\n').slice(0, 1024),
      inline: false
    },
    {
      name: 'Leave DM',
      value: [
        `**Status:** ${leave.dmEnabled ? 'on' : 'off'}`,
        `**Message:** ${formatTemplatePreview(leave.dmMessage)}`,
        ...buildAnnouncementStyleLines(guildConfig, leave, { modeKey: 'dmMode', titleKey: 'dmTitle', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl' })
      ].join('\n').slice(0, 1024),
      inline: false
    },
    {
      name: 'Quick setup',
      value: [
        `\`${prefix}leave on\``,
        `\`${prefix}leave channel #logs\``,
        `\`${prefix}leave mode embed\``,
        `\`${prefix}leave message {userTag} a quitté {server}\``
      ].join('\n'),
      inline: true
    },
    {
      name: 'DM setup',
      value: [
        `\`${prefix}leave dm on\``,
        `\`${prefix}leave dmmode plain\``,
        `\`${prefix}leave dmmessage Merci d'être passé sur {server}\``,
        `\`${prefix}leave testdm\``
      ].join('\n'),
      inline: true
    },
    {
      name: 'Checks',
      value: `\`${prefix}leave vars\` • \`${prefix}leave example\` • \`${prefix}leave test\` • \`${prefix}leave testdm\` • \`${prefix}leave reset\``,
      inline: false
    }
  );
  return embed;
}
function buildBoostModuleEmbed(guildConfig, prefix = '+') {
  const boost = guildConfig.boost || {};
  const embed = baseEmbed(guildConfig, '🚀 Boost module', 'Boost announcement style. The event stays under logs/tracking, but the text is managed here too.');
  embed.addFields(
    {
      name: 'Current state',
      value: [
        `**Status:** ${boost.enabled ? 'on' : 'off'}`,
        `**Channel:** ${boost.channelId ? `<#${boost.channelId}>` : 'not set'}`,
        `**Message:** ${formatTemplatePreview(boost.message)}`,
        ...buildAnnouncementStyleLines(guildConfig, boost)
      ].join('\n').slice(0, 1024),
      inline: false
    },
    {
      name: 'Quick setup',
      value: [
        `\`${prefix}boost on\``,
        `\`${prefix}boost channel #boosts\``,
        `\`${prefix}boost mode embed\``,
        `\`${prefix}boost message {user} vient de booster {server}\``
      ].join('\n'),
      inline: true
    },
    {
      name: 'Advanced style',
      value: [
        `\`${prefix}boost title 🚀 Nouveau boost\``,
        `\`${prefix}boost footer Merci pour le soutien\``,
        `\`${prefix}boost color #FF73FA\``,
        `\`${prefix}boost image https://...\``
      ].join('\n'),
      inline: true
    },
    {
      name: 'Checks',
      value: `\`${prefix}boost vars\` • \`${prefix}boost example\` • \`${prefix}boost test\` • \`${prefix}boost reset\``,
      inline: false
    }
  );
  return embed;
}
function formatTemplatePreview(value, fallback = 'not set') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const compact = text.replace(/\s+/g, ' ').trim();
  const preview = compact.length > 140 ? `${compact.slice(0, 137)}…` : compact;
  return `\`${preview}\``;
}

function clipText(value, max = 160) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(1, max - 1))}…`;
}

const TEXT_VARIABLE_LINES = [
  '`{user}` → mention du membre',
  '`{userTag}` → pseudo complet',
  '`{server}` → nom du serveur',
  '`{memberCount}` → nombre de membres',
  '`{boostCount}` → nombre de boosts',
  '`{boostTier}` → palier de boost'
];

function normalizeAnnouncementMode(value) {
  return String(value || 'embed').toLowerCase() === 'plain' ? 'plain' : 'embed';
}

function getAnnouncementModeLabel(value) {
  return normalizeAnnouncementMode(value) === 'plain' ? 'plain message' : 'embed';
}

function buildAnnouncementStyleLines(guildConfig, source, options = {}) {
  const modeKey = options.modeKey || 'mode';
  const titleKey = options.titleKey || 'title';
  const footerKey = options.footerKey || 'footer';
  const colorKey = options.colorKey || 'color';
  const imageKey = options.imageKey || 'imageUrl';
  const mode = normalizeAnnouncementMode(source?.[modeKey]);
  return [
    `**Mode:** ${getAnnouncementModeLabel(mode)}`,
    `**Title:** ${formatTemplatePreview(source?.[titleKey], mode === 'embed' ? 'none' : 'optional')}`,
    `**Footer:** ${mode === 'embed' ? formatTemplatePreview(source?.[footerKey], 'DvL') : 'unused in plain mode'}`,
    `**Color:** ${mode === 'embed' ? code(source?.[colorKey] || guildConfig?.embedColor || '#5865F2') : 'unused in plain mode'}`,
    `**Image:** ${mode === 'embed' ? formatTemplatePreview(source?.[imageKey], 'none') : 'unused in plain mode'}`
  ];
}

function createAnnouncementPreviewPayload(guildConfig, style, description) {
  const mode = normalizeAnnouncementMode(style?.mode);
  const title = String(style?.title || '').trim();
  const footer = style?.footer === null ? '' : String(style?.footer ?? 'DvL').trim();
  const imageUrl = String(style?.imageUrl || '').trim();
  const color = ensureHexColor(style?.color || guildConfig?.embedColor || '#5865F2');
  if (mode === 'plain') {
    const content = [title ? `**${title}**` : null, description || null, imageUrl || null].filter(Boolean).join('\n');
    return { content: content || 'No content.' };
  }
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) embed.setImage(imageUrl);
  return { embeds: [embed] };
}

function buildTextExamplesEmbed(guildConfig, moduleKey, prefix = '+') {
  const blocks = {
    welcome: {
      title: '👋 Welcome examples',
      lines: [
        '**Clean embed**',
        `Title: \`👋 Welcome\``,
        `Message: \`Bienvenue {user} sur **{server}** • membre **#{memberCount}**\``,
        '',
        '**Simple plain**',
        `Mode: \`${prefix}welcome mode plain\``,
        `Message: \`Bienvenue {user} sur {server}\``,
        '',
        '**Advanced embed**',
        `\`${prefix}welcome color #00D26A\` • \`${prefix}welcome footer Profite bien du serveur\` • \`${prefix}welcome image https://...\``
      ]
    },
    leave: {
      title: '👋 Leave examples',
      lines: [
        '**Clean embed**',
        `Title: \`👋 Un membre est parti\``,
        `Message: \`{userTag} a quitté **{server}**.\``,
        '',
        '**Leave DM**',
        `\`${prefix}leave dm on\` • \`${prefix}leave dmmessage Tu as quitté **{server}**.\`\n\`${prefix}leave dmmode plain\` pour un DM sans embed`,
        '',
        '**Advanced embed**',
        `\`${prefix}leave color #F87171\` • \`${prefix}leave footer Bonne continuation\` • \`${prefix}leave image https://...\``
      ]
    },
    boost: {
      title: '🚀 Boost examples',
      lines: [
        '**Clean embed**',
        `Title: \`🚀 Nouveau boost\``,
        `Message: \`{user} vient de booster **{server}** • total: **{boostCount}** • tier: **{boostTier}**\``,
        '',
        '**Simple plain**',
        `Mode: \`${prefix}boost mode plain\``,
        `Message: \`Merci {user} pour le boost sur {server} !\``,
        '',
        '**Advanced embed**',
        `\`${prefix}boost color #FF73FA\` • \`${prefix}boost footer Merci pour le soutien\` • \`${prefix}boost image https://...\``
      ]
    }
  };
  const entry = blocks[moduleKey] || blocks.welcome;
  return baseEmbed(guildConfig, entry.title, entry.lines.join('\n').slice(0, 4000));
}


function getTextTemplateVars(guild, member) {
  return {
    user: member?.toString?.() || `<@${member?.id || '0'}>`,
    userTag: member?.user?.tag || 'Unknown#0000',
    server: guild?.name || 'Server',
    memberCount: guild?.memberCount || 0,
    boostCount: guild?.premiumSubscriptionCount || 0,
    boostTier: guild?.premiumTier || 0
  };
}

function isOffWord(value) {
  return ['off', 'none', 'clear', 'remove'].includes(String(value || '').toLowerCase());
}

function isDefaultWord(value) {
  return ['default', 'reset'].includes(String(value || '').toLowerCase());
}

function isValidHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isValidHexColorInput(value) {
  return /^#?[0-9a-f]{6}$/i.test(String(value || '').trim());
}


function createModulePreviewMessage(guildConfig, source, variables, options = {}) {
  const titleKey = options.titleKey || 'title';
  const messageKey = options.messageKey || 'message';
  const modeKey = options.modeKey || 'mode';
  const footerKey = options.footerKey || 'footer';
  const colorKey = options.colorKey || 'color';
  const imageKey = options.imageKey || 'imageUrl';
  const fallbackTitle = options.fallbackTitle || '';
  const textValue = fillTemplate(source?.[messageKey], variables);
  const titleValue = fillTemplate(source?.[titleKey] || fallbackTitle, variables);
  const footerValue = source?.[footerKey] === null ? null : fillTemplate(source?.[footerKey] ?? 'DvL', variables);
  const imageUrl = fillTemplate(source?.[imageKey] || '', variables);
  return createAnnouncementPreviewPayload(guildConfig, {
    mode: source?.[modeKey],
    title: titleValue,
    footer: footerValue,
    color: source?.[colorKey],
    imageUrl
  }, textValue);
}


function getSupportPromptVariables(guild, support, prefix = '+', fallbackChannel = null) {
  return {
    server: guild?.name || 'Server',
    prefix,
    supportChannel: support?.entryChannelId ? `<#${support.entryChannelId}>` : (fallbackChannel ? `<#${fallbackChannel.id}>` : '#support')
  };
}

function createSupportPromptPayload(guildConfig, guild, prefix = '+', fallbackChannel = null) {
  const support = guildConfig.support || {};
  const vars = getSupportPromptVariables(guild, support, prefix, fallbackChannel);
  const title = fillTemplate(support.promptTitle || '📨 Need help?', vars).trim();
  const description = fillTemplate(support.promptMessage || 'To contact the staff, go to {supportChannel} and run `{prefix}support your message`.', vars).trim();
  const footer = fillTemplate(support.promptFooter ?? 'DvL Support', vars).trim();
  const imageUrl = fillTemplate(support.promptImageUrl || '', vars).trim();
  return createAnnouncementPreviewPayload(guildConfig, {
    mode: support.promptMode || 'embed',
    title,
    footer,
    color: support.promptColor,
    imageUrl
  }, description);
}

function buildSupportModuleEmbed(guildConfig, prefix = '+') {
  const support = guildConfig.support || {};
  return baseEmbed(guildConfig, '📨 Support hub', 'Keep support simple: one relay for staff, one optional public support channel, and one configurable prompt panel.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Relay:** ${support.enabled ? 'on' : 'off'}`,
          `**Relay channel:** ${support.channelId ? `<#${support.channelId}>` : 'not set'}`,
          `**Member channel:** ${support.entryChannelId ? `<#${support.entryChannelId}>` : 'not set'}`,
          `**Restrict to member channel:** ${support.restrictToEntry ? 'on' : 'off'}`,
          `**Ping role:** ${support.pingRoleId ? `<@&${support.pingRoleId}>` : 'none'}`,
          `**Prompt style:** ${normalizeAnnouncementMode(support.promptMode)} • ${support.promptTitle ? 'custom title' : 'default title'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Quick setup',
        value: [
          `\`${prefix}support panel\``,
          `\`${prefix}support relay #support-logs\``,
          `\`${prefix}support entry #support\``,
          `\`${prefix}support role @Staff\``,
          `\`${prefix}support test\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Member flow',
        value: [
          `post the prompt in the public support channel`,
          `members run \`${prefix}support mon message\``,
          `bot moves the conversation to DM`,
          `staff answer with \`${prefix}reply\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Keep it clean',
        value: [
          `• use \`${prefix}support panel\` or \`${prefix}support text config\` to edit the prompt with buttons`,
          `• \`${prefix}support channel ...\` still works as a legacy alias for the relay channel`,
          `• \`${prefix}support text send\` posts the public prompt in the current or configured member channel`
        ].join('\n').slice(0, 1024),
        inline: false
      }
    );
}

function createSupportPanelEmbed(guildConfig, guild, prefix = '+', currentChannel = null) {
  const support = guildConfig.support || {};
  const channelMention = currentChannel?.isTextBased?.() ? currentChannel.toString() : 'this channel';
  const previewTarget = support.entryChannelId ? `<#${support.entryChannelId}>` : (currentChannel?.isTextBased?.() ? channelMention : 'not set');
  const embed = baseEmbed(guildConfig, '📨 Support panel', `One clean place for the support flow. Use buttons instead of stacking a lot of similar commands.`)
    .addFields(
      {
        name: 'Routing',
        value: [
          `**Relay:** ${support.enabled ? 'on' : 'off'}`,
          `**Relay channel:** ${support.channelId ? `<#${support.channelId}>` : 'not set'}`,
          `**Member channel:** ${support.entryChannelId ? `<#${support.entryChannelId}>` : 'not set'}`,
          `**Restrict members:** ${support.restrictToEntry ? 'on' : 'off'}`,
          `**Ping role:** ${support.pingRoleId ? `<@&${support.pingRoleId}>` : 'none'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Prompt style',
        value: [
          `**Mode:** ${normalizeAnnouncementMode(support.promptMode)}`,
          `**Title:** ${formatTemplatePreview(support.promptTitle, 'default')}`,
          `**Message:** ${formatTemplatePreview(support.promptMessage, 'default')}`,
          `**Footer:** ${formatTemplatePreview(support.promptFooter, 'default')}`,
          `**Color:** ${support.promptColor || guildConfig.embedColor || '#5865F2'}`,
          `**Image:** ${formatTemplatePreview(support.promptImageUrl, 'none')}`
        ].join('\n').slice(0, 1024),
        inline: false
      },
      {
        name: 'Useful vars',
        value: '`{prefix}` • `{server}` • `{supportChannel}`',
        inline: true
      },
      {
        name: 'Preview target',
        value: `${previewTarget}\nPanel opened from: ${channelMention}`.slice(0, 1024),
        inline: true
      },
      {
        name: 'Still useful by command',
        value: [
          `\`${prefix}support role @Staff\``,
          `\`${prefix}support relay off\``,
          `\`${prefix}support entry off\``
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: 'DvL • support panel' });
  return embed;
}

function createSupportPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('supportpanel:toggle').setLabel('Relay on/off').setEmoji('📨').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('supportpanel:relayhere').setLabel('Relay here').setEmoji('🧾').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:entryhere').setLabel('Support here').setEmoji('📍').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:restrict').setLabel('Restrict').setEmoji('🚧').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:refresh').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('supportpanel:mode').setLabel('Embed/plain').setEmoji('🎨').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('supportpanel:edit:title').setLabel('Title').setEmoji('🏷️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:edit:message').setLabel('Message').setEmoji('💬').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:edit:footer').setLabel('Footer').setEmoji('🧷').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:send').setLabel('Send prompt').setEmoji('📤').setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('supportpanel:edit:color').setLabel('Color').setEmoji('🌈').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:edit:image').setLabel('Image').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:clear:entry').setLabel('Clear entry').setEmoji('🧹').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:clear:relay').setLabel('Clear relay').setEmoji('🧹').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supportpanel:reset').setLabel('Reset text').setEmoji('♻️').setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildTextsHubEmbed(guildConfig, prefix = '+', focus = 'home') {
  const safeFocus = ['home', 'welcome', 'leave', 'boost', 'vars'].includes(focus) ? focus : 'home';
  const welcome = guildConfig.welcome || {};
  const leave = guildConfig.leave || {};
  const boost = guildConfig.boost || {};

  if (safeFocus === 'welcome') return buildWelcomeModuleEmbed(guildConfig, prefix);
  if (safeFocus === 'leave') return buildLeaveModuleEmbed(guildConfig, prefix);
  if (safeFocus === 'boost') return buildBoostModuleEmbed(guildConfig, prefix);

  if (safeFocus === 'vars') {
    return baseEmbed(guildConfig, '🧩 Text variables', 'Variables available in welcome, leave and boost messages.')
      .addFields(
        { name: 'Variables', value: TEXT_VARIABLE_LINES.join('\n').slice(0, 1024), inline: false },
        { name: 'Where to use them', value: [
          `\`${prefix}welcome message ...\``,
          `\`${prefix}leave message ...\``,
          `\`${prefix}leave dmmessage ...\``,
          `\`${prefix}boost message ...\``
        ].join('\n'), inline: true },
        { name: 'Preview', value: [
          `\`${prefix}welcome test\``,
          `\`${prefix}leave test\``,
          `\`${prefix}leave testdm\``,
          `\`${prefix}boost test\``
        ].join('\n'), inline: true }
      );
  }

  return baseEmbed(guildConfig, '📝 Texts hub', 'Main place to control welcome, leave and boost announcement style.')
    .addFields(
      {
        name: 'Modules',
        value: [
          `**Welcome:** ${welcome.enabled ? 'on' : 'off'} • ${welcome.channelId ? `<#${welcome.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(welcome.mode)}`,
          `**Leave:** ${leave.enabled ? 'on' : 'off'} • ${leave.channelId ? `<#${leave.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(leave.mode)}`,
          `**Leave DM:** ${leave.dmEnabled ? 'on' : 'off'} • ${getAnnouncementModeLabel(leave.dmMode)}`,
          `**Boost text:** ${boost.enabled ? 'on' : 'off'} • ${boost.channelId ? `<#${boost.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(boost.mode)}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Open a module',
        value: [
          `\`${prefix}texts welcome\``,
          `\`${prefix}texts leave\``,
          `\`${prefix}texts boost\``,
          `\`${prefix}texts vars\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Fast examples',
        value: [
          `\`${prefix}welcome mode embed\``,
          `\`${prefix}leave dmmode plain\``,
          `\`${prefix}boost color #FF73FA\``,
          `\`${prefix}boost example\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Good to know',
        value: '*Welcome and leave are grouped here. Boost text is editable here too, but the boost event itself stays under logs/tracking.*',
        inline: false
      }
    );
}

function buildSetupHubEmbed(guildConfig, prefix = '+') {
  const logs = guildConfig.logs || {};
  const support = guildConfig.support || {};
  const stats = guildConfig.stats || {};
  const welcome = guildConfig.welcome || {};
  const leave = guildConfig.leave || {};
  const boost = guildConfig.boost || {};
  return baseEmbed(guildConfig, '🧩 Setup hub', 'Main entry point to configure the bot cleanly without hunting for old commands.')
    .addFields(
      {
        name: 'Recommended order',
        value: [
          `1. \`${prefix}config\``,
          `2. \`${prefix}system\``,
          `3. \`${prefix}logs setup\``,
          `4. \`${prefix}texts\``,
          `5. \`${prefix}tracking\``,
          `6. \`${prefix}support\``,
          `7. \`${prefix}roles view\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Quick jumps',
        value: [
          `\`${prefix}setup check\``,
          `\`${prefix}setup logs\``,
          `\`${prefix}setup texts\``,
          `\`${prefix}setup tracking\``,
          `\`${prefix}setup security\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Current status',
        value: [
          `**Logs:** ${logs.enabled ? 'on' : 'off'} • ${(logs.channels?.default || logs.channelId) ? `<#${logs.channels?.default || logs.channelId}>` : 'no route'}`,
          `**Welcome:** ${welcome.enabled ? 'on' : 'off'} • ${welcome.channelId ? `<#${welcome.channelId}>` : 'no channel'}`,
          `**Leave:** ${leave.enabled ? 'on' : 'off'} • ${leave.channelId ? `<#${leave.channelId}>` : 'no channel'}`,
          `**Boost text:** ${boost.enabled ? 'on' : 'off'} • ${boost.channelId ? `<#${boost.channelId}>` : 'no channel'}`,
          `**Support:** ${support.enabled ? 'on' : 'off'} • ${support.channelId ? `<#${support.channelId}>` : 'no channel'}`,
          `**Stats:** ${stats.enabled ? 'on' : 'off'} • ${stats.categoryId ? `<#${stats.categoryId}>` : 'no category'}`
        ].join('\n').slice(0, 1024),
        inline: false
      },
      {
        name: 'Useful hubs',
        value: [
          `\`${prefix}system\` • \`${prefix}dashboard\` • \`${prefix}configpanel\``,
          `\`${prefix}logs\` • \`${prefix}texts\` • \`${prefix}tracking\``,
          `\`${prefix}support\` • \`${prefix}roles view\` • \`${prefix}voice\``,
          `\`${prefix}security\` • \`${prefix}automation\` • \`${prefix}backup\``
        ].join('\n'),
        inline: false
      }
    );
}


function buildVoiceHubEmbed(guildConfig, prefix = '+') {
  const voice = guildConfig.voice || {};
  const temp = voice.temp || {};
  const moderation = voice.moderation || {};
  return baseEmbed(guildConfig, '🔊 Voice hub', 'Temp voice, panels and voice moderation in one place.')
    .addFields(
      {
        name: 'Temp voice',
        value: [
          `**Hub channel:** ${temp.hubChannelId ? `<#${temp.hubChannelId}>` : 'not set'}`,
          `**Hub category:** ${temp.hubCategoryId ? `<#${temp.hubCategoryId}>` : 'not set'}`,
          `**Panels posted:** ${Object.keys(temp.panels || {}).length}`,
          `**Saved temp channels:** ${Object.keys(temp.channels || {}).length}`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Moderation',
        value: [
          `**Mute role:** ${moderation.muteRoleId ? `<@&${moderation.muteRoleId}>` : 'not set'}`,
          `**Ban role:** ${moderation.banRoleId ? `<@&${moderation.banRoleId}>` : 'not set'}`,
          `**Panel command:** \`${prefix}voice panel\``,
          `**Hub command:** \`${prefix}voice create\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Useful commands',
        value: [
          `\`${prefix}voice create\` • create or register the temp voice hub`,
          `\`${prefix}voice panel\` • post the control panel`,
          `\`${prefix}voice muterole @Role\` • save the voice mute role`,
          `\`${prefix}voice banrole @Role\` • save the voice ban role`
        ].join('\n'),
        inline: false
      }
    );
}

function buildSecurityHubEmbed(guildConfig, prefix = '+') {
  const mod = guildConfig.automod || {};
  const ghost = mod.ghostPing || { enabled: false, channelId: null };
  const enabledCount = ['antiSpam', 'antiLink', 'antiInvite', 'antiMention', 'antiCaps', 'antiEmojiSpam', 'raidMode'].filter((key) => mod[key]?.enabled).length;
  return baseEmbed(guildConfig, '🚨 Security hub', 'Presets, ghost ping and the main AutoMod toggles.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Main filters on:** ${enabledCount}`,
          `**Ghost ping:** ${ghost.enabled ? 'on' : 'off'}${ghost.channelId ? ` • <#${ghost.channelId}>` : ''}`,
          `**Anti spam:** ${mod.antiSpam?.enabled ? 'on' : 'off'}`,
          `**Anti invite:** ${mod.antiInvite?.enabled ? 'on' : 'off'}`,
          `**Anti caps:** ${mod.antiCaps?.enabled ? 'on' : 'off'}`,
          `**Raid mode:** ${mod.raidMode?.enabled ? 'on' : 'off'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Fast setup',
        value: [
          `\`${prefix}security preset balanced\``,
          `\`${prefix}security ghostping here\``,
          `\`${prefix}security ghostping test\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Advanced',
        value: [
          `\`${prefix}setantispam 6 5 delete\``,
          `\`${prefix}setantimention 5 delete\``,
          `\`${prefix}setanticaps 10 80 delete\``,
          `\`${prefix}automodconfig\``
        ].join('\n'),
        inline: true
      }
    );
}

function buildAutomationHubEmbed(guildConfig, prefix = '+') {
  const stickyEntries = Object.entries(guildConfig.sticky || {});
  const reactEntries = Object.entries(guildConfig.autoReact?.channels || {});
  return baseEmbed(guildConfig, '⚡ Automation hub', 'Sticky messages, auto-react and small quality-of-life automations.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Sticky channels:** ${stickyEntries.length}`,
          `**Auto-react channels:** ${reactEntries.length}`,
          `**Status role:** ${guildConfig.roles?.statusRole?.enabled ? 'on' : 'off'}`,
          `**Ghost ping:** ${guildConfig.automod?.ghostPing?.enabled ? 'on' : 'off'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Sticky',
        value: [
          `\`${prefix}stickyset <message>\``,
          `\`${prefix}stickyconfig\``,
          `\`${prefix}stickyoff\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Auto-react',
        value: [
          `\`${prefix}autoreact config\``,
          `\`${prefix}autoreact add 😀\``,
          `\`${prefix}autoreact preset #general hype\``
        ].join('\n'),
        inline: true
      }
    );
}

function buildGiveawayHubEmbed(guildConfig, prefix = '+') {
  const giveaways = Object.values(guildConfig.giveaways || {});
  const active = giveaways.filter((entry) => !entry.ended && !entry.deleted).length;
  const paused = giveaways.filter((entry) => entry.paused && !entry.ended && !entry.deleted).length;
  const latest = giveaways.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
  return baseEmbed(guildConfig, '🎁 Giveaway hub', 'Create, monitor and reroll giveaways from one cleaner hub.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Saved giveaways:** ${giveaways.length}`,
          `**Active:** ${active}`,
          `**Paused:** ${paused}`,
          `**Latest:** ${latest ? `\`${clipText(latest.prize, 50)}\`` : 'none'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Main flow',
        value: [
          `\`${prefix}gstart 10m 1 Nitro\``,
          `\`${prefix}giveaway list\``,
          `\`${prefix}ginfo <id>\``,
          `\`${prefix}greroll <id>\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Management',
        value: [
          `\`${prefix}gpause <id>\``,
          `\`${prefix}gresume <id>\``,
          `\`${prefix}gend <id>\``,
          `\`${prefix}gdelete <id>\``
        ].join('\n'),
        inline: true
      }
    );
}

function buildTikTokHubEmbed(guildConfig, prefix = '+') {
  const watchers = guildConfig.tiktok?.watchers || [];
  const liveOn = watchers.filter((watcher) => watcher.announceLive !== false).length;
  const videoOn = watchers.filter((watcher) => watcher.announceVideos !== false).length;
  return baseEmbed(guildConfig, '🎵 TikTok hub', 'Watch TikTok accounts and route live/video alerts cleanly.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Watchers:** ${watchers.length}`,
          `**Live alerts on:** ${liveOn}`,
          `**Video alerts on:** ${videoOn}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Main flow',
        value: [
          `\`${prefix}tiktok list\``,
          `\`${prefix}tiktok add username here\``,
          `\`${prefix}tiktok channel username #channel\``,
          `\`${prefix}tiktok role username @Role\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Checks',
        value: [
          `\`${prefix}tiktok live username on\``,
          `\`${prefix}tiktok video username off\``,
          `\`${prefix}tiktok test username\``,
          `\`${prefix}tiktok check\``
        ].join('\n'),
        inline: true
      }
    );
}

function buildTrackingHubEmbed(guildConfig, prefix = '+') {
  const stats = guildConfig.stats || {};
  const inviteEntries = Object.entries(guildConfig.invites?.stats || {});
  const totalInvites = inviteEntries.reduce((sum, [, data]) => sum + (data?.count || 0), 0);
  const topInvite = inviteEntries.sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))[0] || null;
  return baseEmbed(guildConfig, '📈 Tracking hub', 'Counters, invite tracking and refresh helpers.')
    .addFields(
      {
        name: 'Status',
        value: [
          `**Stats counters:** ${stats.enabled ? 'on' : 'off'} • ${Object.values(stats.channels || {}).filter(Boolean).length} channel(s)`,
          `**Stats category:** ${stats.categoryId ? `<#${stats.categoryId}>` : 'not set'}`,
          `**Tracked inviters:** ${inviteEntries.length}`,
          `**Total stored invites:** ${formatStatNumber(totalInvites)}`,
          `**Top inviter:** ${topInvite ? `<@${topInvite[0]}> • ${topInvite[1]?.count || 0}` : 'none'}`
        ].join('\n').slice(0, 1024),
        inline: false
      },
      {
        name: 'Stats setup',
        value: [
          `\`${prefix}stats view\``,
          `\`${prefix}stats setup\``,
          `\`${prefix}stats refresh\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Invites',
        value: [
          `\`${prefix}invites @member\``,
          `\`${prefix}inviteleaderboard\``
        ].join('\n'),
        inline: true
      }
    );
}

function buildModerationHubEmbed(guildConfig, prefix = '+') {
  const warnings = guildConfig.moderation?.warnings || {};
  const totalWarnings = Object.values(warnings).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  return baseEmbed(guildConfig, '🛡️ Moderation hub', 'Warns, timeouts, kicks and bans with clearer staff replies, DMs and audit logs.')
    .addFields(
      {
        name: 'What is polished',
        value: [
          `**Warn flow:** warn + count + clean reason log`,
          `**Timeout flow:** DM + duration + audit log`,
          `**Kick / ban flow:** DM when possible + richer staff recap`,
          `**Warnings stored:** ${formatStatNumber(totalWarnings)}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Most used',
        value: [
          `\`${prefix}warn @member reason\``,
          `\`${prefix}warnings @member\``,
          `\`${prefix}timeout @member 10m reason\``,
          `\`${prefix}untimeout @member\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'More actions',
        value: [
          `\`${prefix}kick @member reason\``,
          `\`${prefix}ban @member reason\``,
          `\`${prefix}unban userId\``,
          `\`${prefix}clearwarnings @member\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Good to know',
        value: [
          `• moderation actions try to DM the target when possible`,
          `• detailed audit logs go to the moderation log route`,
          `• voice moderation stays under \`${prefix}voice\``
        ].join('\n').slice(0, 1024),
        inline: false
      }
    );
}

function buildSystemHubEmbed(guildConfig, prefix = '+') {
  const logs = guildConfig.logs || {};
  const support = guildConfig.support || {};
  const progress = guildConfig.progress || {};
  const stats = guildConfig.stats || {};
  return baseEmbed(guildConfig, '🧰 System hub', 'Core admin shortcuts: dashboard, panels, diagnostics and backups.')
    .addFields(
      {
        name: 'Core tools',
        value: [
          `\`${prefix}dashboard\``,
          `\`${prefix}panel\``,
          `\`${prefix}modules\``,
          `\`${prefix}setupcheck\``,
          `\`${prefix}backup list\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Snapshot',
        value: [
          `logs ${logs.enabled ? 'on' : 'off'}`,
          `support ${support.enabled ? 'on' : 'off'}`,
          `stats ${stats.enabled ? 'on' : 'off'}`,
          `progress ${progress.enabled ? 'on' : 'off'}`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Good order',
        value: [
          `\`${prefix}dashboard\` for the overview`,
          `\`${prefix}setupcheck\` to catch missing config`,
          `\`${prefix}backup create\` before risky changes`
        ].join('\n'),
        inline: false
      }
    );
}

async function ensureNamedTextChannel(guild, name, parentId, reason) {
  const safeName = String(name || 'logs').toLowerCase().slice(0, 100);
  let channel = guild.channels.cache.find((entry) => entry?.parentId === parentId && isLogsTextChannel(entry) && entry.name === safeName) || null;
  if (!channel) {
    channel = await guild.channels.create({
      name: safeName,
      type: ChannelType.GuildText,
      parent: parentId || null,
      reason: reason || 'DvL channel setup'
    }).catch(() => null);
  }
  return channel;
}

async function setupLogsBundle(ctx, categoryName = '🧾 Logs') {
  const guild = ctx.guild;
  const logs = ctx.guildConfig.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
  const knownRouteIds = [
    logs.channels?.default || logs.channelId || null,
    logs.channels?.messages || null,
    logs.channels?.members || null,
    logs.channels?.moderation || null,
    logs.channels?.voice || null,
    logs.channels?.server || null,
    logs.channels?.social || null
  ].filter(Boolean);

  let category = null;
  for (const channelId of knownRouteIds) {
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel?.parent?.type === ChannelType.GuildCategory) {
      category = channel.parent;
      break;
    }
  }

  if (!category) {
    category = guild.channels.cache.find((entry) => entry?.type === ChannelType.GuildCategory && /log/i.test(entry.name)) || null;
  }

  if (!category) {
    category = await guild.channels.create({
      name: String(categoryName || '🧾 Logs').slice(0, 100),
      type: ChannelType.GuildCategory,
      reason: `DvL logs setup by ${ctx.user.tag}`
    }).catch(() => null);
  }

  if (!category) return null;

  const plan = [
    ['default', 'logs'],
    ['messages', 'message-logs'],
    ['members', 'member-logs'],
    ['moderation', 'mod-logs'],
    ['voice', 'voice-logs'],
    ['server', 'server-logs'],
    ['social', 'social-logs']
  ];

  const created = {};
  for (const [key, fallbackName] of plan) {
    const existingId = key === 'default' ? (logs.channels?.default || logs.channelId || null) : (logs.channels?.[key] || null);
    let channel = existingId ? (guild.channels.cache.get(existingId) || await guild.channels.fetch(existingId).catch(() => null)) : null;
    if (!isLogsTextChannel(channel)) {
      channel = await ensureNamedTextChannel(guild, fallbackName, category.id, `DvL logs setup by ${ctx.user.tag}`);
    }
    if (channel && channel.parentId !== category.id) await channel.setParent(category.id).catch(() => null);
    created[key] = channel || null;
  }

  ctx.store.updateGuild(ctx.guild.id, (guildConfig) => {
    guildConfig.logs = guildConfig.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
    guildConfig.logs.enabled = true;
    guildConfig.logs.channels = guildConfig.logs.channels || { default: null, messages: null, members: null, moderation: null, voice: null, server: null, social: null };
    guildConfig.logs.channels.default = created.default?.id || null;
    guildConfig.logs.channelId = created.default?.id || null;
    guildConfig.logs.channels.messages = created.messages?.id || null;
    guildConfig.logs.channels.members = created.members?.id || null;
    guildConfig.logs.channels.moderation = created.moderation?.id || null;
    guildConfig.logs.channels.voice = created.voice?.id || null;
    guildConfig.logs.channels.server = created.server?.id || null;
    guildConfig.logs.channels.social = created.social?.id || null;
    guildConfig.logs.types = guildConfig.logs.types || {};
    return guildConfig;
  });

  return { category, channels: created };
}

function createActionCommand(name, emoji, verbs, aliases, templates) {
  return makeSimpleCommand({
    name,
    aliases,
    category: 'Action',
    description: `${name} someone with a GIF`,
    usage: `${name} @member|id`,
    guildOnly: true,
    slash: {
      root: 'action',
      sub: name,
      description: `${name} a member`,
      options: [{ type: 'user', name: 'target', description: 'Target member', required: true }]
    },
    async execute(ctx) {
      const target = await ctx.getMember('target', 0);
      if (!target) return ctx.invalidUsage(`Try \`${ctx.prefix}${name} @user\``);
      const template = randomOf(templates);
      const verb = randomOf(verbs);
      const description = template
        .replace('{author}', ctx.member.toString())
        .replace('{target}', target.toString())
        .replace('{verb}', verb);
      const embed = baseEmbed(ctx.guildConfig, `${emoji} ${name.toUpperCase()}`, description);
      const gif = getActionGif(name);
      if (gif) embed.setImage(gif);
      await ctx.reply({ embeds: [embed] });
    }
  });
}

function createTransformCommand(name, description, usage, aliases, fn) {
  return makeSimpleCommand({
    name,
    aliases,
    category: 'Utility',
    description,
    usage,
    dmAllowed: true,
    slash: {
      root: 'utility',
      sub: name,
      description,
      options: [{ type: 'string', name: 'text', description: 'Text', required: true }]
    },
    async execute(ctx) {
      const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
      if (!text) return ctx.invalidUsage();
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, `🛠️ ${name}`, String(fn(text)).slice(0, 4090))] });
    }
  });
}

function createMeterCommand(name, description, usage, aliases, title, min, max, suffix) {
  return makeSimpleCommand({
    name,
    aliases,
    category: 'Fun',
    description,
    usage,
    dmAllowed: true,
    slash: {
      root: 'fun',
      sub: name,
      description,
      options: [{ type: 'string', name: 'text', description: 'Text', required: true }]
    },
    async execute(ctx) {
      const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
      if (!text) return ctx.invalidUsage();
      const value = min + Math.floor(Math.random() * (max - min + 1));
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, title, `**${text}** → **${value}${suffix}**`)] });
    }
  });
}

function createToggleCommand(name, description, path, aliases = []) {
  return makeSimpleCommand({
    name,
    aliases,
    category: 'Security',
    description,
    usage: `${name} on|off`,
    guildOnly: true,
    userPermissions: [PermissionFlagsBits.ManageGuild],
    slash: {
      root: 'security',
      sub: name,
      description,
      options: [{
        type: 'string',
        name: 'state',
        description: 'on / off',
        required: true,
        choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }]
      }]
    },
    async execute(ctx) {
      const state = (ctx.getText('state', 0) || '').toLowerCase();
      if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
      ctx.store.updateGuild(ctx.guild.id, (guild) => {
        const parts = path.split('.');
        let ref = guild;
        for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
        ref[parts.at(-1)] = state === 'on';
        return guild;
      });
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Security', `**${name}** is now **${state}**.`)] });
    }
  });
}

function ownerBase(name, description, usage, aliases, options, execute) {
  return makeSimpleCommand({
    name,
    aliases,
    category: 'Owner',
    description,
    usage,
    ownerOnly: true,
    slash: {
      root: 'owner',
      sub: name,
      description,
      options
    },
    async execute(ctx) {
      await execute(ctx);
    }
  });
}

function getCommandLookup(client, query) {
  const raw = String(query || '').trim().replace(/^[+/]/, '').toLowerCase();
  if (!raw) return null;
  return client.commandRegistry.find((cmd) => cmd.name === raw || (cmd.aliases || []).includes(raw)) || null;
}

function formatPermissionLabel(permission) {
  const entry = Object.entries(PermissionFlagsBits).find(([, value]) => value === permission);
  const raw = entry?.[0] || String(permission || '');
  return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/Guild/g, 'Server').trim();
}

function formatCommandAccess(command) {
  const scope = command.guildOnly ? 'Server only' : (command.dmAllowed ? 'DM + server' : 'Server by default');
  const perms = command.userPermissions?.length ? command.userPermissions.map(formatPermissionLabel).join(', ') : 'No special permission';
  return { scope, perms };
}

function createCommandHelpEmbed(client, guildConfig, command) {
  const prefix = guildConfig?.prefix || '+';
  const access = formatCommandAccess(command);
  const slashText = command.slash ? `\`/${command.slash.root} ${command.slash.sub}\`` : 'No slash version';
  return new EmbedBuilder()
    .setColor(ensureHexColor(guildConfig?.embedColor))
    .setTitle(`📘 ${prefix}${command.name}`)
    .setDescription(command.description || 'No description.')
    .addFields(
      { name: 'Category', value: `${CATEGORY_META[command.category]?.emoji || '•'} ${command.category}`, inline: true },
      { name: 'Access', value: access.scope, inline: true },
      { name: 'Permissions', value: access.perms, inline: false },
      { name: 'Usage', value: `\`${prefix}${command.usage || command.name}\``, inline: false },
      { name: 'Aliases', value: command.aliases?.length ? command.aliases.map((alias) => `\`${prefix}${alias}\``).join(', ') : 'None', inline: false },
      { name: 'Slash', value: slashText, inline: false }
    )
    .setFooter({ text: 'DvL • help' })
    .setTimestamp();
}

function chunkLines(lines, size = 12) {
  const chunks = [];
  for (let i = 0; i < lines.length; i += size) chunks.push(lines.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function buildHelpLine(prefix, cmd, category = null) {
  const aliasList = cmd.aliases || [];
  const aliasPreview = aliasList.slice(0, category === 'All' ? 1 : 2);
  const usage = String(cmd.usage || cmd.name || '').trim();
  const usageText = usage ? `\`${prefix}${usage}\`` : `\`${prefix}${cmd.name}\``;
  const aliasText = aliasPreview.length ? `\n↳ aliases: ${aliasPreview.map((a) => `\`${prefix}${a}\``).join(', ')}${aliasList.length > aliasPreview.length ? ' …' : ''}` : '';
  const categoryText = category === 'All' ? ` • ${CATEGORY_META[cmd.category]?.emoji || '•'} ${cmd.category}` : '';
  return `**\`${prefix}${cmd.name}\`**${categoryText}\n↳ ${cmd.description}\n↳ usage: ${usageText}${aliasText}`;
}

function getSetupHelpPages() {
  const entries = Object.entries(CONFIG_HELP_GROUPS);
  const pages = [];
  for (let i = 0; i < entries.length; i += SETUP_GROUPS_PER_PAGE) pages.push(entries.slice(i, i + SETUP_GROUPS_PER_PAGE));
  return pages.length ? pages : [[]];
}

const HELP_SPECIAL_PAGES = {
  start: 'start',
  quickstart: 'start',
  quick: 'start',
  debut: 'start',
  staff: 'staff',
  mod: 'staff',
  staffs: 'staff',
  members: 'members',
  member: 'members',
  user: 'members',
  users: 'members',
  fix: 'repair',
  repair: 'repair',
  doctor: 'repair'
};

function createSpecialHelpEmbed(guildConfig, kind = 'start') {
  const prefix = guildConfig?.prefix || '+';
  if (kind === 'start') {
    return baseEmbed(guildConfig, '🚀 Help • Quick start', [
      'Launch the bot with the minimum useful setup first.',
      '',
      `1. \`${prefix}logs setup\``,
      `2. \`${prefix}support panel\``,
      `3. \`${prefix}welcome\` and \`${prefix}leave\``,
      `4. \`${prefix}stats setup\` if you want counters`,
      '',
      'Fast checks:',
      `• \`${prefix}setup check\``,
      `• \`${prefix}repair all\``,
      `• \`${prefix}panel\``
    ].join('\n'));
  }
  if (kind === 'staff') {
    return baseEmbed(guildConfig, '🛠️ Help • Staff essentials', [
      `Logs: \`${prefix}logs view\` • \`${prefix}logs panel\``,
      `Support: \`${prefix}support panel\` • \`${prefix}reply\``,
      `Roles: \`${prefix}roles view\` • \`${prefix}autorolelist\``,
      `Security: \`${prefix}security\` • \`${prefix}wl list\``,
      `Repair: \`${prefix}repair\` • \`${prefix}setup check\``,
      '',
      'Good daily checks:',
      `• \`${prefix}stats\``,
      `• \`${prefix}backup list\``,
      `• \`${prefix}glist\``
    ].join('\n'));
  }
  if (kind === 'members') {
    return baseEmbed(guildConfig, '👥 Help • Member commands', [
      `Need staff? Use \`${prefix}support your message\`.`,
      `Need a role button? Check the role panel in the server.`,
      `Temp voice controls live on the voice panel if enabled.`,
      '',
      'Simple public commands:',
      `• \`${prefix}help\``,
      `• \`${prefix}invite\``,
      `• \`${prefix}serverinfo\``,
      `• \`${prefix}userinfo\``
    ].join('\n'));
  }
  return baseEmbed(guildConfig, '🧰 Help • Repair', [
    `Run \`${prefix}repair\` for a full report.`,
    `Target one area: \`${prefix}repair texts\` • \`${prefix}repair logs\` • \`${prefix}repair support\` • \`${prefix}repair stats\` • \`${prefix}repair security\``,
    '',
    `Use \`${prefix}setup check\` if you mainly want a readable overview before fixing anything.`
  ].join('\n'));
}

function getHelpTargetInfo(client, target = 'Home') {
  const commands = client.commandRegistry.filter((cmd) => !cmd.hidden);
  const rawQuery = String(target || '').trim();
  const forceCommand = /^([+/]|cmd\s+)/i.test(rawQuery);
  const cleanedQuery = rawQuery.replace(/^cmd\s+/i, '').trim();
  const specialPage = HELP_SPECIAL_PAGES[cleanedQuery.toLowerCase()] || null;
  if (!forceCommand && specialPage) return { type: 'special', special: specialPage, category: 'Home', totalPages: 1 };
  const categoryName = Object.keys(CATEGORY_META).find((name) => name.toLowerCase() === cleanedQuery.toLowerCase()) || (cleanedQuery ? null : 'Home');
  if (!forceCommand && categoryName) {
    const category = categoryName;
    if (category === 'Home') return { type: 'category', category, totalPages: 1 };
    if (category === 'Setup') return { type: 'category', category, totalPages: getSetupHelpPages().length };
    if (category === 'Categories') {
      const visibleCategories = CATEGORY_ORDER.filter((name) => commands.some((cmd) => cmd.category === name));
      return { type: 'category', category, totalPages: Math.max(1, Math.ceil(visibleCategories.length / 10)) };
    }
    const selected = commands
      .filter((cmd) => category === 'All' ? true : cmd.category === category)
      .sort((a, b) => category === 'All' ? (a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name));
    return { type: 'category', category, totalPages: Math.max(1, Math.ceil(selected.length / 5)) };
  }
  const matchedCommand = getCommandLookup(client, cleanedQuery);
  if (matchedCommand) return { type: 'command', command: matchedCommand, category: matchedCommand.category, totalPages: 1 };
  const category = categoryName || 'Home';
  if (category === 'Home') return { type: 'category', category, totalPages: 1 };
  if (category === 'Setup') return { type: 'category', category, totalPages: getSetupHelpPages().length };
  if (category === 'Categories') {
    const visibleCategories = CATEGORY_ORDER.filter((name) => commands.some((cmd) => cmd.category === name));
    return { type: 'category', category, totalPages: Math.max(1, Math.ceil(visibleCategories.length / 10)) };
  }
  const selected = commands
    .filter((cmd) => category === 'All' ? true : cmd.category === category)
    .sort((a, b) => category === 'All' ? (a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name));
  return { type: 'category', category, totalPages: Math.max(1, Math.ceil(selected.length / 5)) };
}

function createHelpEmbed(client, guildConfig, target = 'Home', page = 1) {
  const prefix = guildConfig?.prefix || '+';
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(guildConfig?.embedColor))
    .setTimestamp()
    .setFooter({ text: 'DvL • help' });

  const commands = client.commandRegistry.filter((cmd) => !cmd.hidden);
  const info = getHelpTargetInfo(client, target);
  if (info.type === 'command') return createCommandHelpEmbed(client, guildConfig, info.command);
  if (info.type === 'special') return createSpecialHelpEmbed(guildConfig, info.special);

  const category = info.category || 'Home';
  const safePage = Math.min(Math.max(1, Number(page) || 1), info.totalPages || 1);

  if (category === 'Home') {
    const grouped = {};
    for (const command of commands) grouped[command.category] = (grouped[command.category] || 0) + 1;
    const configCount = new Set(Object.values(CONFIG_HELP_GROUPS).flat()).size;
    embed
      .setTitle('✨ DvL Help Center')
      .setDescription([
        'Vue rapide du bot.',
        `Le bouton **Categories** ouvre une navigation propre au lieu d'afficher tout d'un coup.`,
        '',
        `Examples: \`${prefix}help ban\`, \`${prefix}help logs\`, \`${prefix}help tracking\`, \`${prefix}help support\`, \`${prefix}help setup\`, \`${prefix}panel\``,
        `Shortcuts: \`${prefix}help start\` • \`${prefix}help staff\` • \`${prefix}help members\` • \`${prefix}help repair\``,
        `Prefix: \`${prefix}\``,
        `Commands: **${commands.length}** • Aliases: **${commands.reduce((sum, cmd) => sum + (cmd.aliases?.length || 0), 0)}**`
      ].join('\n'))
      .addFields(
        { name: `${CATEGORY_META.Setup?.emoji || '•'} Setup`, value: `**${configCount}** setup command(s)`, inline: true },
        { name: '📂 Browse', value: 'Use the **Categories** button below.', inline: true },
        { name: '📚 Full list', value: `Use **All** or \`${prefix}help all\`.`, inline: true },
        { name: '🚀 Start', value: `\`${prefix}help start\``, inline: true },
        { name: '🛠️ Staff', value: `\`${prefix}help staff\``, inline: true },
        { name: '🧰 Repair', value: `\`${prefix}help repair\``, inline: true }
      );
    return embed;
  }

  if (category === 'Categories') {
    const grouped = {};
    for (const command of commands) grouped[command.category] = (grouped[command.category] || 0) + 1;
    const visibleCategories = CATEGORY_ORDER.filter((name) => grouped[name]);
    const pages = chunkLines(visibleCategories, 10);
    const current = pages[safePage - 1] || [];
    embed
      .setTitle('📂 Help Categories')
      .setDescription([
        `Page **${safePage}/${pages.length}** • choisis une catégorie avec les boutons en dessous.`,
        `Tu peux aussi chercher direct avec \`${prefix}help +commande\`.`
      ].join('\n'));
    current.forEach((name) => {
      embed.addFields({
        name: `${CATEGORY_META[name]?.emoji || '•'} ${name}`,
        value: [`**${grouped[name] || 0}** command(s)`, CATEGORY_BLURBS[name] || ''].filter(Boolean).join('\n'),
        inline: true
      });
    });
    return embed;
  }

  if (category === 'Setup') {
    const setupPages = getSetupHelpPages();
    const currentGroups = setupPages[safePage - 1] || [];
    embed
      .setTitle('🧩 Setup Center')
      .setDescription([
        'Main setup hub for the server. You can also use `+setup` for the practical view.',
        `Fast start: \`${prefix}config\` • \`${prefix}system\` • \`${prefix}logs\` • \`${prefix}help tracking\` • \`${prefix}help support\``,
        `Page **${safePage}/${setupPages.length}** • modules grouped to avoid Discord field limits.`
      ].join('\n'));

    for (const [groupName, names] of currentGroups) {
      const lines = names
        .map((name) => client.commandRegistry.find((cmd) => cmd.name === name))
        .filter(Boolean)
        .map((cmd) => {
          const aliasText = cmd.aliases?.length ? ` • ${cmd.aliases.slice(0, 2).map((a) => `\`${prefix}${a}\``).join(', ')}` : '';
          return `**\`${prefix}${cmd.name}\`** — ${cmd.description}${aliasText}`;
        });
      const chunks = chunkLines(lines, 4);
      chunks.forEach((chunk, index) => {
        if (chunk.length) embed.addFields({ name: index === 0 ? groupName : `${groupName} (more)`, value: chunk.join('\n').slice(0, 1024), inline: false });
      });
    }

    if (!currentGroups.length) embed.addFields({ name: 'Setup', value: 'No setup groups found.', inline: false });
    return embed;
  }

  const selectedCommands = commands
    .filter((cmd) => category === 'All' ? true : cmd.category === category)
    .sort((a, b) => category === 'All' ? (a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name));
  const selected = selectedCommands.map((cmd) => buildHelpLine(prefix, cmd, category));
  const perPage = category === 'All' ? 5 : 5;
  const pages = chunkLines(selected, perPage);
  const currentLines = pages[safePage - 1] || [];

  embed.setTitle(`${CATEGORY_META[category]?.emoji || '•'} ${category} Commands`);

  const intro = [];
  intro.push(`Page **${safePage}/${pages.length}** • **${selectedCommands.length}** command(s) in this view.`);
  intro.push(`Use \`${prefix}help +<command>\` for one command or \`${prefix}help ${category.toLowerCase()} ${Math.min(pages.length, safePage + 1)}\` to jump pages.`);
  if (category === 'All') intro.push('This is the full command list, split into smaller pages so nothing gets cut off.');
  if (category === 'System') {
    intro.push(
      `Dashboard, quick panels, backup and diagnostics live here so Config stays focused on real setup.`,
      `Use \`${prefix}system\` for the hub, then \`${prefix}dashboard\`, \`${prefix}configpanel\`, \`${prefix}modules\`, or \`${prefix}setupcheck\`.`
    );
  }
  if (category === 'Tracking') {
    intro.push(
      `Counters and invite tracking are grouped here so they are not mixed into logs or base config anymore.`,
      `Use \`${prefix}tracking\` for the hub, then \`${prefix}stats view\`, \`${prefix}stats setup\`, \`${prefix}invites @member\`, or \`${prefix}inviteleaderboard\`.`
    );
  }
  if (category === 'Support') {
    intro.push(
      `Members: run \`${prefix}support\` in the server, then send the real message in bot DMs.`,
      `Staff: use \`${prefix}reply @user <text>\` in the support channel or reply to a forwarded message with \`${prefix}reply <text>\`.`
    );
  }
  if (category === 'Permissions') {
    intro.push(
      `Set a level role with \`${prefix}permrole 1 @Role\``,
      `Allow a command with \`${prefix}permcmd 1 add timeout\``,
      `Review everything with \`${prefix}permconfig\``
    );
  }
  if (category === 'Voice') {
    intro.push(
      `\`${prefix}move @user <voice channel>\` moves one member.`,
      `\`${prefix}moveall <voice channel>\` moves everyone from your current voice channel.`,
      `\`${prefix}voicepanel [category]\` posts a temp voice button panel.`
    );
  }
  if (category === 'Logs') {
    intro.push(`Use \`${prefix}logs view\` for the clean summary, \`${prefix}logs types\` for every event, or \`${prefix}logs panel\` for buttons.`);
    intro.push(`The nicest logs are now message/member events: cleaner fields, avatar thumbnail and better jump links when available.`);
    intro.push(`Quick examples: \`${prefix}logs boost here\`, \`${prefix}logs enable join leave boost\`, \`${prefix}logs test boost\`.`);
  }
  if (category === 'Security') {
    intro.push(`Use \`${prefix}ghostping on\` to log deleted or edited mentions.`);
    intro.push(`Set a dedicated alert channel with \`${prefix}ghostping #channel\` or \`${prefix}ghostping here\`.`);
    intro.push(`Check the full setup with \`${prefix}automodconfig\` or use \`${prefix}securitypreset balanced\`.`);
  }
  if (category === 'Automation') {
    intro.push(`Sticky messages and auto-react are grouped here so they are not mixed with random utility commands.`);
    intro.push(`Use \`${prefix}automation\` for the clean hub, \`${prefix}stickyconfig\` for sticky messages, and \`${prefix}autoreact config\` for reactions.`);
  }
  if (category === 'Progress') {
    intro.push(`Trophy board and milestone rewards are grouped here so the whole progress system stays in one place.`);
    intro.push(`Open \`${prefix}trophy\` for the hub, then use \`${prefix}trophy config\` or \`${prefix}milestoneconfig\` for details.`);
  }
  embed.setDescription(intro.join('\n'));

  const fieldChunks = chunkLines(currentLines, 3);
  if (!currentLines.length) {
    embed.addFields({ name: 'Commands', value: 'No commands here.', inline: false });
  } else {
    fieldChunks.forEach((chunk, idx) => embed.addFields({
      name: idx === 0 ? 'Commands' : 'More',
      value: chunk.join('\n').slice(0, 1024),
      inline: false
    }));
  }
  return embed;
}

function createHelpComponents(current = 'Home', page = 1, totalPages = 1) {
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help:Home:1').setLabel('🏠 Home').setStyle(current === 'Home' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:Setup:1').setLabel('🧩 Setup').setStyle(current === 'Setup' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:Categories:1').setLabel('📂 Categories').setStyle(current === 'Categories' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:All:1').setLabel('📚 All').setStyle(current === 'All' ? ButtonStyle.Success : ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help:start:1').setLabel('🚀 Start').setStyle(current === 'start' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:staff:1').setLabel('🛠️ Staff').setStyle(current === 'staff' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:members:1').setLabel('👥 Members').setStyle(current === 'members' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:repair:1').setLabel('🧰 Repair').setStyle(current === 'repair' ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  ];

  if (current === 'Categories') {
    const visibleCategories = CATEGORY_ORDER.filter((category) => !['Home', 'Setup', 'All', 'Categories'].includes(category));
    const totalCategoryPages = Math.max(1, Math.ceil(visibleCategories.length / 10));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalCategoryPages);
    const currentChunk = visibleCategories.slice((safePage - 1) * 10, safePage * 10);
    if (visibleCategories.length > 10) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`helpnav:Categories:${Math.max(1, safePage - 1)}`).setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 1),
        new ButtonBuilder().setCustomId(`helpnav:Categories:${Math.min(totalCategoryPages, safePage + 1)}`).setLabel('Next ➡️').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= totalCategoryPages)
      ));
    }
    for (let i = 0; i < currentChunk.length; i += 5) {
      const chunk = currentChunk.slice(i, i + 5);
      rows.push(new ActionRowBuilder().addComponents(
        ...chunk.map((category) => new ButtonBuilder()
          .setCustomId(`help:${category}:1`)
          .setLabel(`${CATEGORY_META[category]?.emoji || '•'} ${category}`)
          .setStyle(ButtonStyle.Secondary))
      ));
    }
    return rows;
  }

  if (current === 'Setup' && totalPages > 1) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`helpnav:Setup:${Math.max(1, page - 1)}`).setLabel(`⬅️ Prev (${Math.max(1, page - 1)})`).setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
      new ButtonBuilder().setCustomId(`helpnav:Setup:${Math.min(totalPages, page + 1)}`).setLabel(`Next (${Math.min(totalPages, page + 1)}) ➡️`).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages)
    ));
    return rows;
  }

  if (totalPages > 1) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`helpnav:${current}:${Math.max(1, page - 1)}`).setLabel(`⬅️ Prev (${Math.max(1, page - 1)})`).setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
      new ButtonBuilder().setCustomId(`helpnav:${current}:${Math.min(totalPages, page + 1)}`).setLabel(`Next (${Math.min(totalPages, page + 1)}) ➡️`).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages)
    ));
  }
  return rows;
}

function createLogsPanelEmbed(guildConfig, page = 1) {
  const logs = guildConfig.logs || { enabled: false, channelId: null, channels: {}, types: {} };
  const safePage = Math.min(Math.max(1, Number(page) || 1), LOG_CHANNEL_GROUPS.length);
  const group = getLogChannelGroup(LOG_CHANNEL_GROUPS[safePage - 1]?.key);
  const lines = group.types.map((key) => {
    const label = LOG_TYPE_CHOICES.find(([value]) => value === key)?.[1] || key;
    return `${logs.types?.[key] === false ? '🔴' : '🟢'} **${label}** — \`${key}\``;
  });
  const routeChannels = logs.channels || {};
  const familyChannelId = routeChannels[group.key] || null;
  const defaultChannelId = routeChannels.default || logs.channelId || null;
  return baseEmbed(guildConfig, `🧾 Logs Panel • ${group.label}`, [
    `**Master:** ${logs.enabled ? 'on' : 'off'}`,
    `**Default route:** ${defaultChannelId ? `<#${defaultChannelId}>` : 'not set'}`,
    `**This page route:** ${familyChannelId ? `<#${familyChannelId}>` : 'using default route'}`,
    `**Page:** ${safePage}/${LOG_CHANNEL_GROUPS.length}`,
    '',
    'Use **Set Default Here** to route every uncategorised log to the current channel.',
    `Use **Set ${group.label} Here** to send only this family of logs to the current channel.`,
    '',
    ...lines
  ].join('\n'));
}

function createLogsPanelComponents(guildConfig, page = 1) {
  const logs = guildConfig.logs || { enabled: false, types: {} };
  const safePage = Math.min(Math.max(1, Number(page) || 1), LOG_CHANNEL_GROUPS.length);
  const group = getLogChannelGroup(LOG_CHANNEL_GROUPS[safePage - 1]?.key);
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`logpanel:master:${logs.enabled ? 'off' : 'on'}:${safePage}`).setLabel(logs.enabled ? 'Disable logs' : 'Enable logs').setStyle(logs.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`logpanel:setdefault:${safePage}`).setLabel('Set Default Here').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`logpanel:setroute:${group.key}:${safePage}`).setLabel(`Set ${group.key}`).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`logpanel:refresh:${safePage}`).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
    )
  ];
  for (let i = 0; i < group.types.length; i += 4) {
    const chunk = group.types.slice(i, i + 4);
    rows.push(new ActionRowBuilder().addComponents(
      ...chunk.map((key) => {
        const label = LOG_TYPE_CHOICES.find(([value]) => value === key)?.[1] || key;
        return new ButtonBuilder()
          .setCustomId(`logpanel:type:${key}:${safePage}`)
          .setLabel(label.slice(0, 20))
          .setStyle(logs.types?.[key] === false ? ButtonStyle.Secondary : ButtonStyle.Success);
      })
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`logpanel:page:${Math.max(1, safePage - 1)}`).setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 1),
    new ButtonBuilder().setCustomId(`logpanel:page:${Math.min(LOG_CHANNEL_GROUPS.length, safePage + 1)}`).setLabel('Next ➡️').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= LOG_CHANNEL_GROUPS.length)
  ));
  return rows;
}

function createVoicePanelEmbed(guildConfig) {
  return baseEmbed(guildConfig, '🔊 Voice Control Panel', [
    'Use **Create / Join** to create or jump into your temp voice.',
    'While you are inside your temp voice, the other buttons manage that channel.',
    '',
    '**Create hub:** set one with `+createvoc` so members can auto-create by joining it.',
    '**Owner tools:** lock, hide, rename, change limit, transfer crown, kick members, delete the channel.'
  ].join('\n'));
}

function createVoicePanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('voicehub:create').setLabel('Create / Join').setEmoji('🔊').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('voicectl:claim').setLabel('Claim Crown').setEmoji('👑').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('voicectl:rename').setLabel('Rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:delete').setLabel('Delete').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('voicectl:refresh').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('voicectl:lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:hide').setLabel('Hide').setEmoji('🙈').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:show').setLabel('Show').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:info').setLabel('Info').setEmoji('ℹ️').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('voicectl:limitdown').setLabel('- Limit').setEmoji('➖').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:limitup').setLabel('+ Limit').setEmoji('➕').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voicectl:transfer').setLabel('Transfer').setEmoji('👑').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('voicectl:kick').setLabel('Kick').setEmoji('🦶').setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildSlashCommands(commands) {
  const roots = new Map();
  for (const command of commands) {
    if (!command.slash) continue;
    const rootName = command.slash.root;
    if (!roots.has(rootName)) {
      roots.set(rootName, new SlashCommandBuilder().setName(rootName).setDescription(`${rootName} commands`).setDMPermission(true));
    }
    const root = roots.get(rootName);
    root.addSubcommand((sub) => {
      sub.setName(command.slash.sub).setDescription(command.slash.description || command.description || command.name);
      const orderedOptions = [...(command.slash.options || [])].sort((a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)));
      for (const option of orderedOptions) addOption(sub, option);
      return sub;
    });
  }
  return [...roots.values()].map((builder) => builder.toJSON());
}

function createCommands() {
  const commands = [
    makeSimpleCommand({
      name: 'help',
      aliases: ['h', 'commands', 'cmds'],
      category: 'General',
      description: 'Interactive help menu with buttons and command lookup',
      usage: 'help [category|command|alias]',
      dmAllowed: true,
      slash: {
        root: 'general',
        sub: 'help',
        description: 'Show the help menu',
        options: [{ type: 'string', name: 'category', description: 'Category', required: false, choices: Object.keys(CATEGORY_META).filter((k) => k !== 'Home').map((k) => ({ name: k, value: k })) }]
      },
      async execute(ctx) {
        let lookup = 'Home';
        let page = 1;
        if (ctx.interaction) {
          lookup = ctx.interaction.options.getString('category') || 'Home';
        } else if (ctx.args.length) {
          const possiblePage = Number(ctx.args[ctx.args.length - 1]);
          if (Number.isInteger(possiblePage) && possiblePage > 0 && ctx.args.length > 1) {
            page = possiblePage;
            lookup = ctx.args.slice(0, -1).join(' ');
          } else {
            lookup = ctx.getRest(0) || 'Home';
          }
        }
        const info = getHelpTargetInfo(ctx.client, lookup);
        const current = info.category || 'Home';
        const safePage = Math.min(Math.max(1, page), info.totalPages || 1);
        await ctx.reply({ embeds: [createHelpEmbed(ctx.client, ctx.guildConfig, lookup, safePage)], components: createHelpComponents(current, safePage, info.totalPages || 1) });
      }
    }),
    makeSimpleCommand({
      name: 'ping',
      aliases: ['latency'],
      category: 'General',
      description: 'Show bot latency',
      usage: 'ping',
      dmAllowed: true,
      slash: { root: 'general', sub: 'ping', description: 'Show bot latency' },
      async execute(ctx) {
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏓 Pong', `Gateway latency: **${ctx.client.ws.ping}ms**`)] });
      }
    }),
    makeSimpleCommand({
      name: 'invite',
      aliases: ['botinvite', 'inv'],
      category: 'General',
      description: 'Show the bot invite link',
      usage: 'invite',
      dmAllowed: true,
      slash: { root: 'general', sub: 'invite', description: 'Show the bot invite link' },
      async execute(ctx) {
        const url = process.env.BOT_INVITE_URL || makeInviteUrl(ctx.client.meta.clientId);
        if (!url) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Invite', 'No invite URL available. Set `BOT_INVITE_URL` or `DISCORD_CLIENT_ID`.')] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔗 Invite DvL', `[Click here to invite DvL](${url})`)] });
      }
    }),
    makeSimpleCommand({
      name: 'botinfo',
      aliases: ['about'],
      category: 'General',
      description: 'Show bot information',
      usage: 'botinfo',
      dmAllowed: true,
      slash: { root: 'general', sub: 'botinfo', description: 'Show bot information' },
      async execute(ctx) {
        const guilds = ctx.client.guilds.cache.size;
        const users = ctx.client.users.cache.size;
        const embed = baseEmbed(ctx.guildConfig, '🤖 DvL Info', `**Servers:** ${guilds}\n**Cached users:** ${users}\n**Primary commands:** ${ctx.client.commandRegistry.length}\n**Aliases:** ${ctx.client.commandRegistry.reduce((sum, cmd) => sum + (cmd.aliases?.length || 0), 0)}\n**Latency:** ${ctx.client.ws.ping}ms`);
        if (ctx.client.user) embed.setThumbnail(ctx.client.user.displayAvatarURL());
        await ctx.reply({ embeds: [embed] });
      }
    }),
    makeSimpleCommand({
      name: 'config',
      aliases: ['settings'],
      category: 'Config',
      description: 'Show core guild settings',
      usage: 'config',
      guildOnly: true,
      slash: { root: 'general', sub: 'config', description: 'Show core guild settings' },
      async execute(ctx) {
        const g = ctx.guildConfig;
        const embed = baseEmbed(ctx.guildConfig, '⚙️ Guild Config', 'Main server setup overview. Use `+setup` for the clean setup hub.').addFields(
          {
            name: 'Core',
            value: [
              `**Prefix:** \`${g.prefix}\``,
              `**Embed color:** \`${g.embedColor}\``,
              `**Language:** \`${g.language || 'en'}\``
            ].join('\n'),
            inline: true
          },
          {
            name: 'Welcome / Leave',
            value: [
              `**Welcome:** ${boolEmoji(g.welcome.enabled)} ${g.welcome.channelId ? `<#${g.welcome.channelId}>` : 'no channel'}`,
              `**Leave:** ${boolEmoji(g.leave.enabled)} ${g.leave.channelId ? `<#${g.leave.channelId}>` : 'no channel'}`
            ].join('\n'),
            inline: true
          },
          {
            name: 'Boost / Logs / Support',
            value: [
              `**Boost:** ${boolEmoji(g.boost?.enabled)} ${g.boost?.channelId ? `<#${g.boost.channelId}>` : 'no channel'}`,
              `**Logs:** ${boolEmoji(g.logs.enabled)} ${(g.logs.channels?.default || g.logs.channelId) ? `<#${g.logs.channels?.default || g.logs.channelId}>` : 'no channel'}`,
              `**Support:** ${boolEmoji(g.support.enabled)} ${g.support.channelId ? `<#${g.support.channelId}>` : 'no channel'}`,
              `**Support ping:** ${g.support.pingRoleId ? `<@&${g.support.pingRoleId}>` : 'none'}`
            ].join('\n'),
            inline: true
          },
          {
            name: 'Roles / Tracking',
            value: [
              `**Auto roles:** ${g.roles.autoRoles.length}`,
              `**Status role:** ${g.roles.statusRole?.roleId ? `<@&${g.roles.statusRole.roleId}>` : 'not set'} • ${g.roles.statusRole?.enabled ? 'on' : 'off'}`,
              `**Voice mute role:** ${g.voice?.moderation?.muteRoleId ? `<@&${g.voice.moderation.muteRoleId}>` : 'not set'}`,
              `**Voice ban role:** ${g.voice?.moderation?.banRoleId ? `<@&${g.voice.moderation.banRoleId}>` : 'not set'}`,
              `**Stats panel:** ${g.stats?.enabled ? 'on' : 'off'}${g.stats?.categoryId ? ` • <#${g.stats.categoryId}>` : ''}`,
              `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}${g.progress?.channelId ? ` • <#${g.progress.channelId}>` : ''}`,
              `**TikTok watchers:** ${g.tiktok.watchers.length}`,
              `**Giveaways:** ${Object.keys(g.giveaways || {}).length}`,
              `**Backups:** ${Array.isArray(g.backups) ? g.backups.length : 0}`,
              `**Permission levels set:** ${Object.values(g.permissions?.levels || {}).filter((entry) => entry?.roleId).length}`,
            ].join('\n'),
            inline: false
          },
          {
            name: 'Quick setup',
            value: [
              '`+setup`',
              '`+setwelcomechannel #channel`',
              '`+setlogchannel #logs`',
              '`+setlogchannel messages #msg-logs`',
              '`+statssetup`',
              '`+trophychannel here`',
              '`+setvoicemuterole @MutedVC`',
              '`+setsupportchannel #support`',
              '`+setboostchannel #boosts`'
            ].join(' • '),
            inline: false
          }
        );
        await ctx.reply({ embeds: [embed] });
      }

    }),
    makeSimpleCommand({
      name: 'dashboard',
      aliases: ['overview', 'serveroverview'],
      category: 'System',
      description: 'Open the clean server overview dashboard',
      usage: 'dashboard [home|setup|logs|security|voice|automation|progress]',
      guildOnly: true,
      slash: { root: 'general', sub: 'dashboard', description: 'Open the server dashboard', options: [{ type: 'string', name: 'page', description: 'Dashboard page', required: false, choices: [{ name: 'home', value: 'home' }, { name: 'setup', value: 'setup' }, { name: 'logs', value: 'logs' }, { name: 'security', value: 'security' }, { name: 'voice', value: 'voice' }, { name: 'automation', value: 'automation' }, { name: 'progress', value: 'progress' }] }] },
      async execute(ctx) {
        const raw = String(ctx.getText('page', 0) || ctx.args[0] || 'home').toLowerCase();
        const page = ['home', 'setup', 'logs', 'security', 'voice', 'automation', 'progress'].includes(raw) ? raw : 'home';
        await ctx.reply({ embeds: [createDashboardEmbed(ctx.guildConfig, ctx.guild, page)], components: createDashboardComponents(page) });
      }
    }),

    makeSimpleCommand({
      name: 'configpanel',
      aliases: ['panel', 'customize', 'panelconfig', 'quicksetup', 'setupmenu', 'easysetup', 'stylepanel'],
      category: 'System',
      description: 'Open the smart control center with pages, presets, themes and deployable staff panel',
      usage: 'configpanel [home|texts|welcome|leave|leave-dm|boost|logs|support|security|automation|channels|style|repair|deploy]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const raw = String(ctx.getText('page', 0) || ctx.args[0] || 'home').toLowerCase();
        if (raw === 'deploy') {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Smart panel', 'Open `+panel` in the staff channel you want, then press **Deploy panel**. That message becomes your pinned control center.')] });
        }
        const page = ['home', 'texts', 'welcome', 'leave', 'leave-dm', 'boost', 'logs', 'support', 'security', 'automation', 'channels', 'style', 'repair'].includes(raw) ? raw : 'home';
        await ctx.reply({ embeds: [createConfigPanelEmbed(ctx.guildConfig, ctx.guild, page, ctx.channel)], components: createConfigPanelComponents(page, ctx.channel?.id) });
      }
    }),


    makeSimpleCommand({
      name: 'setup',
      aliases: ['setuphub', 'startersetup'],
      category: 'Config',
      description: 'Clean main setup hub with the shortest path for system, logs, texts, support and tracking',
      usage: 'setup [view|system|check|doctor|logs|texts|support|tracking|stats|roles|voice|security|automation|giveaway|tiktok|progress|backup]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'general', sub: 'setup', description: 'Open the practical setup hub' },
      async execute(ctx) {
        const section = String(ctx.getText('section', 0) || ctx.args[0] || 'view').toLowerCase();
        if (['view', 'home', 'guide', 'start'].includes(section)) return ctx.reply({ embeds: [buildSetupHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'system') return ctx.reply({ embeds: [buildSystemHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'check') return ctx.reply({ embeds: [createSetupCheckEmbed(ctx.guildConfig, ctx.guild)], components: createDashboardComponents('setup') });
        if (section === 'doctor' || section === 'repair') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧰 Setup • Doctor', [
          `Use \`${ctx.prefix}repair\` for the full repair report.`,
          `Fast use: \`${ctx.prefix}repair all\` • \`${ctx.prefix}repair stats\` • \`${ctx.prefix}repair support\``
        ].join('\n'))] });
        if (section === 'logs') return ctx.reply({ embeds: [createLogsOverviewEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'texts') return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'support') return ctx.reply({ embeds: [buildSupportModuleEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'tracking') return ctx.reply({ embeds: [buildTrackingHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'stats') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Setup • Stats', [
          `**Status:** ${ctx.guildConfig.stats?.enabled ? 'on' : 'off'}`,
          `**Category:** ${ctx.guildConfig.stats?.categoryId ? `<#${ctx.guildConfig.stats.categoryId}>` : 'not set'}`,
          '',
          `Quick use: \`${ctx.prefix}stats setup\` • \`${ctx.prefix}stats view\` • \`${ctx.prefix}stats refresh\``
        ].join('\n'))] });
        if (section === 'roles') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Setup • Roles', [
          `Use \`${ctx.prefix}roles view\` for the role hub.`,
          `Auto roles: \`${ctx.prefix}autorole view\``,
          `Permission levels: \`${ctx.prefix}permconfig\``
        ].join('\n'))] });
        if (section === 'voice') return ctx.reply({ embeds: [buildVoiceHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'security') return ctx.reply({ embeds: [buildSecurityHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'automation') return ctx.reply({ embeds: [buildAutomationHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'giveaway') return ctx.reply({ embeds: [buildGiveawayHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'tiktok') return ctx.reply({ embeds: [buildTikTokHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (section === 'progress') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Setup • Progress', [
          `Use \`${ctx.prefix}trophy\` for the progress hub.`,
          `Fast commands: \`${ctx.prefix}trophy refresh\` • \`${ctx.prefix}trophy config\` • \`${ctx.prefix}milestoneconfig\``
        ].join('\n'))] });
        if (section === 'backup') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Setup • Backups', [
          `Use \`${ctx.prefix}backup\` for the backup hub.`,
          `Fast commands: \`${ctx.prefix}backup create\` • \`${ctx.prefix}backup list\``
        ].join('\n'))] });
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}setup\`, \`${ctx.prefix}setup system\`, \`${ctx.prefix}setup check\`, \`${ctx.prefix}setup logs\`, \`${ctx.prefix}setup tracking\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'texts',
      aliases: ['texthub', 'messagehub', 'messagestexts', 'texthelp', 'textstyle'],
      category: 'Welcome',
      description: 'View welcome, leave and boost texts from one clean hub',
      usage: 'texts [view|welcome|leave|boost|vars|examples]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const section = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'home', 'config', 'show', 'list', 'status'].includes(section)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['welcome', 'join'].includes(section)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'welcome')] });
        if (['leave', 'goodbye', 'bye'].includes(section)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'leave')] });
        if (['boost', 'nitro'].includes(section)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'boost')] });
        if (['vars', 'variables', 'placeholders'].includes(section)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'vars')] });
        if (['examples', 'example'].includes(section)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📝 Text examples', [`\`${ctx.prefix}welcome example\``, `\`${ctx.prefix}leave example\``, `\`${ctx.prefix}boost example\``].join('\n'))] });
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}texts\`, \`${ctx.prefix}texts welcome\`, \`${ctx.prefix}texts leave\`, \`${ctx.prefix}texts boost\`, \`${ctx.prefix}texts vars\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'modules',
      aliases: ['moduleview', 'setupview', 'servermodules'],
      category: 'System',
      description: 'Show one clean overview of the main server modules and the quickest commands to use',
      usage: 'modules',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const g = ctx.guildConfig;
        const autoRolesAll = [
          ...(g.roles?.autoRoles || []),
          ...(g.roles?.autoRolesHumans || []),
          ...(g.roles?.autoRolesBots || [])
        ];
        const lines = [
          `**Logs:** ${g.logs?.enabled ? 'on' : 'off'} • routes: **${Object.values(g.logs?.channels || {}).filter(Boolean).length + Object.values(g.logs?.typeChannels || {}).filter(Boolean).length}**`,
          `**Ghost ping:** ${g.automod?.ghostPing?.enabled ? 'on' : 'off'}${g.automod?.ghostPing?.channelId ? ` • <#${g.automod.ghostPing.channelId}>` : ''}`,
          `**Stats:** ${g.stats?.enabled ? 'on' : 'off'} • counters: **${Object.values(g.stats?.channels || {}).filter(Boolean).length}**`,
          `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}${g.progress?.channelId ? ` • <#${g.progress.channelId}>` : ''}`,
          `**Auto-react:** **${Object.keys(g.autoReact?.channels || {}).length}** salon(s)`,
          `**Auto roles:** **${autoRolesAll.filter(Boolean).length}** role(s)`,
          `**Sticky:** **${Object.keys(g.sticky || {}).length}** salon(s)`
        ];
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧩 Modules overview', [
          ...lines,
          '',
          `Quick use: \`${ctx.prefix}system\` • \`${ctx.prefix}logs view\` • \`${ctx.prefix}tracking\` • \`${ctx.prefix}trophy config\` • \`${ctx.prefix}autorole view\` • \`${ctx.prefix}autoreact config\``
        ].join('\n'))] });
      }
    }),


    makeSimpleCommand({
      name: 'system',
      aliases: ['systemhub', 'adminhub', 'controlcenter', 'systemhelp'],
      category: 'System',
      description: 'Clean system hub for dashboard, setup checks, modules and backups',
      usage: 'system [view|dashboard|panel|modules|check|backup|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'home', 'status'].includes(action)) return ctx.reply({ embeds: [buildSystemHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['dashboard', 'dash'].includes(action)) return ctx.reply({ embeds: [createDashboardEmbed(ctx.guildConfig, ctx.guild, 'home')], components: createDashboardComponents('home') });
        if (['panel', 'configpanel'].includes(action)) return ctx.reply({ embeds: [createConfigPanelEmbed(ctx.guildConfig, ctx.guild, 'home', ctx.channel)], components: createConfigPanelComponents('home', ctx.channel?.id) });
        if (action === 'modules') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧩 System • Modules', [
          `Use \`${ctx.prefix}modules\` for the complete module overview.`,
          `Fast path: \`${ctx.prefix}modules\``
        ].join('\n'))] });
        if (['check', 'setupcheck', 'diagnostic'].includes(action)) return ctx.reply({ embeds: [createSetupCheckEmbed(ctx.guildConfig, ctx.guild)], components: createDashboardComponents('setup') });
        if (['backup', 'backups'].includes(action)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 System • Backups', [
          `Use \`${ctx.prefix}backup create\` to save the server state.`,
          `Use \`${ctx.prefix}backup list\` to browse saved backups.`
        ].join('\n'))] });
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}system\`, \`${ctx.prefix}system dashboard\`, \`${ctx.prefix}system check\`, \`${ctx.prefix}system backup\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'tracking',
      aliases: ['trackinghub', 'counterhub', 'inviteshub', 'trackinghelp'],
      category: 'Tracking',
      description: 'Clean tracking hub for stats counters and invite tracking',
      usage: 'tracking [view|stats|invites|leaderboard|refresh|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'home', 'status'].includes(action)) return ctx.reply({ embeds: [buildTrackingHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (action === 'stats') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Tracking • Stats', [
          `Use \`${ctx.prefix}stats view\` for the current counter config.`,
          `Fast setup: \`${ctx.prefix}stats setup\` • \`${ctx.prefix}stats refresh\``
        ].join('\n'))] });
        if (['invites', 'invite'].includes(action)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Tracking • Invites', [
          `Member count: \`${ctx.prefix}invites @member\``,
          `Leaderboard: \`${ctx.prefix}inviteleaderboard\``
        ].join('\n'))] });
        if (['leaderboard', 'lb', 'top'].includes(action)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📈 Tracking', `Use \`${ctx.prefix}inviteleaderboard\`.`)] });
        if (action === 'refresh') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📈 Tracking', `Use \`${ctx.prefix}stats refresh\`.`)] });
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}tracking\`, \`${ctx.prefix}tracking stats\`, \`${ctx.prefix}tracking invites\`, \`${ctx.prefix}tracking refresh\`.`);
      }
    }),


    makeSimpleCommand({
      name: 'voice',
      aliases: ['voicehub', 'voicesetup', 'voicehelp'],
      category: 'Voice',
      description: 'Clean voice hub for temp voice setup, panel and moderation roles',
      usage: 'voice [view|panel|create [name]|muterole <@role|off>|banrole <@role|off>|perms|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildVoiceHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (action === 'panel') return ctx.reply({ embeds: [createVoicePanelEmbed(ctx.guildConfig)], components: createVoicePanelComponents() });
        if (['perms', 'permissions', 'perm'].includes(action)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice permissions', [
            `**Mute role:** ${ctx.guildConfig.voice?.moderation?.muteRoleId ? `<@&${ctx.guildConfig.voice.moderation.muteRoleId}>` : 'not set'}`,
            `**Ban role:** ${ctx.guildConfig.voice?.moderation?.banRoleId ? `<@&${ctx.guildConfig.voice.moderation.banRoleId}>` : 'not set'}`,
            '',
            `Quick use: \`${ctx.prefix}voice muterole @MutedVC\` • \`${ctx.prefix}voice banrole @NoVoice\``
          ].join('\n'))] });
        }
        if (['create', 'hub'].includes(action)) {
          let channel = await ctx.getChannel('channel', 1) || await ctx.getChannel('channel', 0);
          const category = await ctx.getChannel('category', 1);
          let name = ctx.getRest(1) || '➕ Create Voice';
          if (channel && ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) channel = null;
          if (!channel) {
            channel = await ctx.guild.channels.create({
              name: String(name).slice(0, 100),
              type: ChannelType.GuildVoice,
              parent: (category?.type === ChannelType.GuildCategory ? category.id : (ctx.channel.parentId || null)),
              reason: `Voice hub created by ${ctx.user.tag}`
            }).catch(() => null);
          }
          if (!channel) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice hub', 'I could not create the temp voice hub channel.')] });
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null }, moderation: { muteRoleId: null, banRoleId: null } };
            guild.voice.temp = guild.voice.temp || { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null };
            guild.voice.temp.hubChannelId = channel.id;
            guild.voice.temp.hubCategoryId = channel.parentId || null;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice hub ready', [
            `Hub channel: ${channel}`,
            `Use \`${ctx.prefix}voice panel\` in a text channel to post the control panel.`
          ].join('\n'))] });
        }
        if (action === 'muterole' || action === 'banrole') {
          const clear = ['off', 'none', 'remove', 'clear'].includes(String(ctx.args[1] || '').toLowerCase());
          const role = clear ? null : await ctx.getRole('role', 1);
          if (!clear && !role) return ctx.invalidUsage(`Examples: \`${ctx.prefix}voice ${action} @Role\`, \`${ctx.prefix}voice ${action} off\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null }, moderation: { muteRoleId: null, banRoleId: null } };
            guild.voice.moderation = guild.voice.moderation || { muteRoleId: null, banRoleId: null };
            if (action === 'muterole') guild.voice.moderation.muteRoleId = clear ? null : role.id;
            else guild.voice.moderation.banRoleId = clear ? null : role.id;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, action === 'muterole' ? '🔇 Voice mute role' : '⛔ Voice ban role', clear ? 'Role cleared.' : `${role} saved.`)] });
        }
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}voice\`, \`${ctx.prefix}voice create\`, \`${ctx.prefix}voice panel\`, \`${ctx.prefix}voice muterole @MutedVC\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'security',
      aliases: ['securityhub', 'automodhub', 'securityhelp'],
      category: 'Security',
      description: 'Clean security hub for presets and ghost ping setup',
      usage: 'security [view|preset <off|soft|balanced|strict>|ghostping <on|off|here|#channel|test>|config|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildSecurityHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (action === 'preset') {
          const preset = String(ctx.args[1] || '').toLowerCase();
          if (!['off', 'soft', 'balanced', 'strict'].includes(preset)) return ctx.invalidUsage(`Example: \`${ctx.prefix}security preset balanced\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            const mod = guild.automod;
            if (preset === 'off') {
              mod.antiSpam.enabled = false;
              mod.antiLink.enabled = false;
              mod.antiInvite.enabled = false;
              mod.antiMention.enabled = false;
              mod.antiCaps.enabled = false;
              mod.antiEmojiSpam.enabled = false;
              mod.raidMode.enabled = false;
              return guild;
            }
            const strictness = preset === 'soft' ? 0 : (preset === 'balanced' ? 1 : 2);
            mod.antiSpam = { ...mod.antiSpam, enabled: true, maxMessages: strictness === 0 ? 8 : (strictness === 1 ? 6 : 5), perSeconds: strictness === 0 ? 6 : 5, punish: strictness === 2 ? 'timeout' : 'delete' };
            mod.antiLink = { ...mod.antiLink, enabled: true, punish: 'delete' };
            mod.antiInvite = { ...mod.antiInvite, enabled: true, punish: 'delete' };
            mod.antiMention = { ...mod.antiMention, enabled: true, maxMentions: strictness === 0 ? 7 : (strictness === 1 ? 5 : 4), punish: strictness === 2 ? 'timeout' : 'delete' };
            mod.antiCaps = { ...mod.antiCaps, enabled: true, minLength: strictness === 0 ? 14 : 10, percent: strictness === 2 ? 65 : 80, punish: 'delete' };
            mod.antiEmojiSpam = { ...mod.antiEmojiSpam, enabled: true, maxEmojis: strictness === 0 ? 12 : (strictness === 1 ? 8 : 6), punish: 'delete' };
            mod.raidMode = { ...mod.raidMode, enabled: strictness >= 1, joinAgeMinutes: strictness === 2 ? 20160 : 10080 };
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Security preset', `Preset **${preset}** applied.`)] });
        }
        if (action === 'ghostping') {
          const sub = String(ctx.args[1] || '').toLowerCase();
          const pickedChannel = await ctx.getChannel('channel', 1);
          if (!sub || sub === 'config') return ctx.reply({ embeds: [buildSecurityHubEmbed(ctx.guildConfig, ctx.prefix)] });
          if (sub === 'check') return ctx.reply({ embeds: [createLogsOverviewEmbed(ctx.guildConfig, ctx.prefix)] });

        if (sub === 'check') return ctx.reply({ embeds: [buildSupportModuleEmbed(ctx.guildConfig, ctx.prefix)] });

        if (sub === 'test') {
            const rule = ctx.guildConfig.automod?.ghostPing || { enabled: false, channelId: null };
            const channelId = rule.channelId || ctx.channel.id;
            const testChannel = channelId ? (ctx.guild.channels.cache.get(channelId) || await ctx.guild.channels.fetch(channelId).catch(() => null)) : null;
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping test', [
              `**Enabled:** ${rule.enabled ? 'on' : 'off'}`,
              `**Channel:** ${testChannel ? `<#${testChannel.id}>` : 'not found'}`,
              `**Auto-delete:** 2 seconds`,
              '',
              `Use another account to join and verify the ping.`
            ].join('\n'))] });
          }
          if (['on', 'off'].includes(sub)) {
            ctx.store.updateGuild(ctx.guild.id, (guild) => {
              guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
              guild.automod.ghostPing.enabled = sub === 'on';
              return guild;
            });
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping', `Ghost ping is now **${sub}**.`)] });
          }
          if (sub === 'here' || pickedChannel) {
            const channel = sub === 'here' ? ctx.channel : pickedChannel;
            ctx.store.updateGuild(ctx.guild.id, (guild) => {
              guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
              guild.automod.ghostPing.channelId = channel.id;
              guild.automod.ghostPing.enabled = true;
              return guild;
            });
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping', `Joining members will be pinged in ${channel}.`)] });
          }
          return ctx.invalidUsage(`Examples: \`${ctx.prefix}security ghostping on\`, \`${ctx.prefix}security ghostping here\`, \`${ctx.prefix}security ghostping test\`.`);
        }
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}security\`, \`${ctx.prefix}security preset balanced\`, \`${ctx.prefix}security ghostping here\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'moderation',
      aliases: ['modhub', 'modhelp', 'staffmod'],
      category: 'Moderation',
      description: 'Clean moderation hub for warns, timeouts, kicks and bans',
      usage: 'moderation [view|warn|timeout|ban|kick|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'status', 'setup', 'home'].includes(action)) return ctx.reply({ embeds: [buildModerationHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (action === 'warn') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🛡️ Moderation • Warn', [
          `Warn a member and keep a stored history.`,
          `Use: \`${ctx.prefix}warn @member reason\``,
          `Check: \`${ctx.prefix}warnings @member\``
        ].join('\n'))] });
        if (action === 'timeout') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🛡️ Moderation • Timeout', [
          `Timeout a member with a duration like 10m / 1h / 1d.`,
          `Use: \`${ctx.prefix}timeout @member 10m spam\``,
          `Remove: \`${ctx.prefix}untimeout @member\``
        ].join('\n'))] });
        if (action === 'ban') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🛡️ Moderation • Ban', [
          `Ban a member and optionally use a duration in text mode.`,
          `Use: \`${ctx.prefix}ban @member reason\``,
          `Temp ban: \`${ctx.prefix}ban @member 7d reason\``,
          `Unban: \`${ctx.prefix}unban userId\``
        ].join('\n'))] });
        if (action === 'kick') return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🛡️ Moderation • Kick', [
          `Kick a member from the server.`,
          `Use: \`${ctx.prefix}kick @member reason\``
        ].join('\n'))] });
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}moderation\`, \`${ctx.prefix}moderation warn\`, \`${ctx.prefix}moderation timeout\`, \`${ctx.prefix}moderation ban\`.`);
      }
    }),


    makeSimpleCommand({
      name: 'automation',
      aliases: ['automationhub', 'autohub', 'automationhelp'],
      category: 'Automation',
      description: 'View sticky and auto-react modules from one small hub',
      usage: 'automation [view|sticky|autoreact|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildAutomationHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['sticky', 'stickies'].includes(action)) {
          const entries = Object.entries(ctx.guildConfig.sticky || {});
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Automation • Sticky', entries.length ? entries.map(([channelId, entry]) => `**<#${channelId}>**\n${clipText(entry.message, 140)}`).join('\n\n') : `No sticky messages set. Use \`${ctx.prefix}stickyset <message>\` in the target channel.`)] });
        }
        if (['autoreact', 'react'].includes(action)) {
          const entries = Object.entries(ctx.guildConfig.autoReact?.channels || {});
          const lines = entries.length ? entries.slice(0, 10).map(([channelId, entry]) => `• <#${channelId}> • ${entry.enabled === false ? 'off' : 'on'} • mode ${entry.mode || 'all'} • count ${entry.count || 1}`) : [`No auto-react channels set. Use \`${ctx.prefix}autoreact config\`.`];
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '😄 Automation • Auto-react', lines.join('\n'))] });
        }
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}automation\`, \`${ctx.prefix}automation sticky\`, \`${ctx.prefix}automation autoreact\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'giveaway',
      aliases: ['giveawayhub', 'gaway', 'giveawayhelp'],
      category: 'Giveaway',
      description: 'Clean giveaway hub with the main actions in one place',
      usage: 'giveaway [view|list|latest|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'config', 'show', 'list', 'status'].includes(action)) {
          if (action === 'list') {
            const giveaways = Object.values(ctx.guildConfig.giveaways || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const lines = giveaways.length ? giveaways.slice(0, 12).map((entry) => `• \`${entry.id}\` • **${entry.prize}** • ${entry.ended ? 'ended' : (entry.paused ? 'paused' : 'active')} • ${entry.participants?.length || 0} joined`) : ['No giveaways saved yet.'];
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway list', lines.join('\n'))] });
          }
          return ctx.reply({ embeds: [buildGiveawayHubEmbed(ctx.guildConfig, ctx.prefix)] });
        }
        if (action === 'latest') {
          const latest = Object.values(ctx.guildConfig.giveaways || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
          if (!latest) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway', `No giveaway found. Use \`${ctx.prefix}gstart 10m 1 Nitro\`.`)] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, `🎁 Giveaway • ${latest.prize}`, buildGiveawayInfoLines(latest).join('\n'))] });
        }
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}giveaway\`, \`${ctx.prefix}giveaway list\`, \`${ctx.prefix}giveaway latest\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'tiktok',
      aliases: ['tiktokhub', 'tt', 'tiktokhelp'],
      category: 'TikTok',
      description: 'Clean TikTok hub to manage watchers faster from one command',
      usage: 'tiktok [view|list|add <username> <here|#channel>|remove <username>|role <username> <@role|off>|channel <username> <here|#channel>|live <username> <on|off>|video <username> <on|off>|test <username>|check|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        const watchers = ctx.guildConfig.tiktok?.watchers || [];
        if (['view', 'config', 'show', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildTikTokHubEmbed(ctx.guildConfig, ctx.prefix)] });
        if (action === 'list') {
          const lines = watchers.length ? watchers.map((watcher) => `• **@${watcher.username}** → <#${watcher.channelId}> • ping: ${watcher.mentionRoleId ? `<@&${watcher.mentionRoleId}>` : 'none'} • live ${boolEmoji(watcher.announceLive)} • video ${boolEmoji(watcher.announceVideos)}`).join('\n') : 'No TikTok watchers.';
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watchers', lines.slice(0, 4000))] });
        }
        if (action === 'add') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          const rawDest = String(ctx.args[2] || '').toLowerCase();
          const channel = rawDest === 'here' ? ctx.channel : await ctx.getChannel('channel', 2);
          if (!username || !channel?.isTextBased?.()) return ctx.invalidUsage(`Example: \`${ctx.prefix}tiktok add username here\` or \`${ctx.prefix}tiktok add username #channel\`.`);
          const status = await fetchTikTokStatus(username).catch(() => null);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.tiktok.watchers = guild.tiktok.watchers || [];
            guild.tiktok.watchers = guild.tiktok.watchers.filter((entry) => entry.username.toLowerCase() !== username.toLowerCase());
            guild.tiktok.watchers.push({ username, channelId: channel.id, announceVideos: true, announceLive: true, mentionRoleId: null, lastVideoId: status?.latestVideoId || null, wasLive: Boolean(status?.isLive), lastLiveRoomId: status?.liveRoomId || null, lastSource: status?.source || null, lastCheckAt: Date.now(), lastError: null });
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Added **@${username}** → ${channel}`)] });
        }
        if (action === 'remove') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          if (!username) return ctx.invalidUsage(`Example: \`${ctx.prefix}tiktok remove username\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.tiktok.watchers = (guild.tiktok.watchers || []).filter((entry) => entry.username.toLowerCase() !== username.toLowerCase());
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Removed **@${username}**.`)] });
        }
        if (action === 'role') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          const clear = ['off', 'none', 'remove', 'clear'].includes(String(ctx.args[2] || '').toLowerCase());
          const role = clear ? null : await ctx.getRole('role', 2);
          if (!username || (!clear && !role)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}tiktok role username @Role\`, \`${ctx.prefix}tiktok role username off\`.`);
          let found = false;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            const watcher = (guild.tiktok.watchers || []).find((entry) => entry.username.toLowerCase() === username.toLowerCase());
            if (watcher) { watcher.mentionRoleId = clear ? null : role.id; found = true; }
            return guild;
          });
          if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', clear ? `Role cleared for **@${username}**.` : `${role} saved for **@${username}**.`)] });
        }
        if (action === 'channel') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          const rawDest = String(ctx.args[2] || '').toLowerCase();
          const channel = rawDest === 'here' ? ctx.channel : await ctx.getChannel('channel', 2);
          if (!username || !channel?.isTextBased?.()) return ctx.invalidUsage(`Examples: \`${ctx.prefix}tiktok channel username here\`, \`${ctx.prefix}tiktok channel username #channel\`.`);
          let found = false;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            const watcher = (guild.tiktok.watchers || []).find((entry) => entry.username.toLowerCase() === username.toLowerCase());
            if (watcher) { watcher.channelId = channel.id; found = true; }
            return guild;
          });
          if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Channel updated for **@${username}** → ${channel}`)] });
        }
        if (action === 'live' || action === 'video') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          const state = String(ctx.args[2] || '').toLowerCase();
          if (!username || !['on', 'off'].includes(state)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}tiktok ${action} username on\`, \`${ctx.prefix}tiktok ${action} username off\`.`);
          let found = false;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            const watcher = (guild.tiktok.watchers || []).find((entry) => entry.username.toLowerCase() === username.toLowerCase());
            if (watcher) {
              if (action === 'live') watcher.announceLive = state === 'on';
              else watcher.announceVideos = state === 'on';
              found = true;
            }
            return guild;
          });
          if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `${action === 'live' ? 'Live' : 'Video'} announcements for **@${username}** are now **${state}**.`)] });
        }
        if (action === 'test') {
          const username = String(ctx.args[1] || '').replace(/^@/, '');
          if (!username) return ctx.invalidUsage(`Example: \`${ctx.prefix}tiktok test username\`.`);
          const status = await fetchTikTokStatus(username).catch((error) => ({ error: error.message }));
          const preferredUrl = status?.isLive ? (`https://www.tiktok.com/@${username}/live`) : (status?.latestVideoUrl || status?.finalUrl || `https://www.tiktok.com/@${username}`);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok test', status.error ? `Error: **${status.error}**` : `Account: **@${username}**
Latest video: ${status.latestVideoId || 'none'}
Live: ${status.isLive ? 'yes' : 'no'}
Live room: ${status.liveRoomId || 'none'}
Source: ${status.source || 'n/a'}
URL: ${preferredUrl}`)] });
        }
        if (action === 'check') {
          await ctx.client.runTikTokCheck();
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok', `Forced watcher check complete for **${watchers.length}** watcher(s).`)] });
        }
        return ctx.invalidUsage(`Examples: \`${ctx.prefix}tiktok\`, \`${ctx.prefix}tiktok add username here\`, \`${ctx.prefix}tiktok role username @Ping\`, \`${ctx.prefix}tiktok test username\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'logs',
      aliases: ['logpanel', 'logssetup', 'setuplogs', 'logshelp'],
      category: 'Logs',
      description: 'Logs hub: clean overview, auto setup, routes, tests and old panel',
      usage: 'logs [view|setup [category]|types|panel|test <type|all>|on|off|enable <types...>|disable <types...>|<type|family> <here|#channel|off>|status]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const sub = String(ctx.args[0] || '').toLowerCase();
        const logs = ctx.guildConfig.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };

        if (!sub || ['view', 'config', 'show', 'list', 'status', 'routes', 'families'].includes(sub)) {
          return ctx.reply({ embeds: [createLogsOverviewEmbed(ctx.guildConfig, ctx.prefix)] });
        }

        if (sub === 'setup') {
          const categoryName = ctx.args.slice(1).join(' ').trim() || '🧾 Logs';
          const result = await setupLogsBundle(ctx, categoryName);
          if (!result) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs setup', 'I could not create the logs category or channels. Check my channel permissions.')] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs ready', [
            `Category: ${result.category}`,
            `Default: ${result.channels.default || 'not created'}`,
            `Messages: ${result.channels.messages || 'not created'}`,
            `Members: ${result.channels.members || 'not created'}`,
            `Moderation: ${result.channels.moderation || 'not created'}`,
            `Voice: ${result.channels.voice || 'not created'}`,
            `Server: ${result.channels.server || 'not created'}`,
            `Social: ${result.channels.social || 'not created'}`,
            '',
            `Next: \`${ctx.prefix}logs view\` • \`${ctx.prefix}logs boost here\` • \`${ctx.prefix}logs test boost\``
          ].join('\n'))] });
        }

        if (['panel', 'menu', 'buttons'].includes(sub)) {
          return ctx.reply({ embeds: [createLogsPanelEmbed(ctx.guildConfig, 1)], components: createLogsPanelComponents(ctx.guildConfig, 1) });
        }

        if (['types', 'events', 'available'].includes(sub)) {
          return ctx.reply({ embeds: [createLogTypesEmbed(ctx.guildConfig, ctx.prefix)] });
        }

        if (['on', 'off'].includes(sub)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.logs.enabled = sub === 'on';
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs updated', `Logs are now **${sub}**.`)] });
        }

        if (['enable', 'disable'].includes(sub)) {
          const enabled = sub === 'enable';
          const rawTargets = ctx.args.slice(1);
          if (!rawTargets.length) return ctx.invalidUsage(`Examples: \`${ctx.prefix}logs enable boost\`, \`${ctx.prefix}logs disable join leave\`, \`${ctx.prefix}logs disable all\`.`);
          if (rawTargets.some((entry) => ['all', '*'].includes(String(entry).toLowerCase()))) {
            ctx.store.updateGuild(ctx.guild.id, (guild) => {
              guild.logs.enabled = enabled;
              return setLogTypesState(guild, LOG_TYPE_CHOICES.map(([type]) => type), enabled);
            });
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs updated', `All log event types are now **${enabled ? 'on' : 'off'}**.`)] });
          }
          const resolved = rawTargets.map(resolveLogTarget).filter(Boolean);
          const types = [...new Set(resolved.flatMap((target) => getTypesForLogTarget(target)).filter(Boolean))];
          if (!types.length) return ctx.invalidUsage(`Examples: \`${ctx.prefix}logs enable boost\`, \`${ctx.prefix}logs enable join leave boost\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.logs.enabled = true;
            return setLogTypesState(guild, types, enabled);
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs updated', `${types.length} log type(s) set to **${enabled ? 'on' : 'off'}**:
${types.map((type) => `• ${getLogTypeLabel(type)}`).join('\n')}`)] });
        }

        if (sub === 'check') return ctx.reply({ embeds: [createLogsOverviewEmbed(ctx.guildConfig, ctx.prefix)] });

        if (sub === 'check') return ctx.reply({ embeds: [buildSupportModuleEmbed(ctx.guildConfig, ctx.prefix)] });

        if (sub === 'test') {
          const wanted = String(ctx.args[1] || 'all').toLowerCase();
          const targets = wanted === 'all'
            ? ['boost', 'join', 'ghostping', 'voiceJoin']
            : [...new Set((resolveLogTarget(wanted) ? getTypesForLogTarget(resolveLogTarget(wanted)) : []))];
          if (!targets.length) return ctx.invalidUsage(`Examples: \`${ctx.prefix}logs test boost\`, \`${ctx.prefix}logs test join\`, \`${ctx.prefix}logs test all\`.`);
          const results = [];
          for (const type of targets) {
            const channelId = getResolvedLogChannelId(logs, type);
            if (!channelId) {
              results.push(`• **${getLogTypeLabel(type)}** → no route set`);
              continue;
            }
            const channel = await ctx.guild.channels.fetch(channelId).catch(() => null);
            if (!isLogsTextChannel(channel)) {
              results.push(`• **${getLogTypeLabel(type)}** → invalid channel`);
              continue;
            }
            const sent = await channel.send({ embeds: [baseEmbed(ctx.guildConfig, `🧪 Test log • ${getLogTypeLabel(type)}`, `This is a manual test for **${type}**.
Route resolved to ${channel}.`)] }).catch(() => null);
            results.push(`• **${getLogTypeLabel(type)}** → ${sent ? channel.toString() : 'send failed'}`);
          }
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Log test', results.join('\n'))] });
        }

        const target = resolveLogTarget(sub);
        if (target) {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          if (['on', 'off'].includes(rawDestination) && target.kind !== 'default') {
            const enabled = rawDestination === 'on';
            const types = getTypesForLogTarget(target);
            ctx.store.updateGuild(ctx.guild.id, (guild) => {
              guild.logs.enabled = true;
              return setLogTypesState(guild, types, enabled);
            });
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs updated', `${target.label} is now **${rawDestination}**.`)] });
          }

          const disableRoute = ['off', 'none', 'remove', 'clear'].includes(rawDestination);
          let channel = null;
          if (!disableRoute) {
            if (rawDestination === 'here') channel = ctx.channel;
            else channel = await ctx.getChannel('channel', 1);
            if (!isLogsTextChannel(channel)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}logs ${sub} here\`, \`${ctx.prefix}logs ${sub} #logs\`, \`${ctx.prefix}logs ${sub} off\`.`);
          }
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.logs.enabled = true;
            return applyLogChannelTarget(guild, target, disableRoute ? null : channel.id);
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs route updated', disableRoute
            ? `${target.label} route cleared.`
            : `${target.label} route set to ${channel}.`)] });
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}logs setup\`, \`${ctx.prefix}logs view\`, \`${ctx.prefix}logs boost here\`, \`${ctx.prefix}logs test boost\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'setlogchannel',
      aliases: ['logchannel', 'setlogs', 'logschannel'],
      category: 'Logs',
      description: 'Set the default logs channel, one family route, or one exact event type route',
      usage: 'setlogchannel <default|all|messages|members|moderation|voice|server|social|type> <here|#channel|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tracking', sub: 'setlogchannel', description: 'Set the logs channel', options: [
        { type: 'channel', name: 'channel', description: 'Logs channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] },
        { type: 'string', name: 'family', description: 'Default, family, or precise type', required: false }
      ] },
      async execute(ctx) {
        let targetRaw = String(ctx.getText('family', 0) || '').trim();
        let destinationRaw = null;
        let channel = null;
        if (ctx.interaction) {
          destinationRaw = ctx.getText('channel', 1);
          channel = await ctx.getChannel('channel', 1);
        } else {
          const maybeTarget = resolveLogTarget(ctx.args[0]);
          if (maybeTarget) {
            targetRaw = ctx.args[0];
            destinationRaw = String(ctx.args[1] || '');
            if (destinationRaw.toLowerCase() === 'here') channel = ctx.channel;
            else channel = await ctx.getChannel('channel', 1);
          } else {
            targetRaw = 'default';
            destinationRaw = String(ctx.args[0] || '');
            if (destinationRaw.toLowerCase() === 'here') channel = ctx.channel;
            else channel = await ctx.getChannel('channel', 0);
          }
        }
        const target = resolveLogTarget(targetRaw || 'default');
        const disableRoute = ['off', 'none', 'remove', 'clear'].includes(String(destinationRaw || '').toLowerCase());
        if (!target) return ctx.invalidUsage(`Examples: \`${ctx.prefix}setlogchannel default #logs\`, \`${ctx.prefix}setlogchannel boost here\`, \`${ctx.prefix}setlogchannel messages #msg-logs\`.`);
        if (!disableRoute && !isLogsTextChannel(channel)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}setlogchannel boost here\`, \`${ctx.prefix}setlogchannel boost #boost-logs\`, \`${ctx.prefix}setlogchannel boost off\`.`);
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.logs.enabled = true;
          return applyLogChannelTarget(guild, target, disableRoute ? null : channel.id);
        });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs route updated', disableRoute ? `${target.label} route cleared.` : `${target.label} route set to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'logtoggle',
      aliases: ['setlogsstate', 'togglelogs'],
      category: 'Logs',
      description: 'Enable or disable logs globally',
      usage: 'logtoggle <on|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tracking', sub: 'logtoggle', description: 'Enable or disable logs globally', options: [{ type: 'string', name: 'state', description: 'on or off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.logs.enabled = state === 'on';
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Logs updated', `Logs are now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'logtype',
      aliases: ['setlogtype', 'logevent'],
      category: 'Logs',
      description: 'Enable or disable one log event type, one family, or all',
      usage: 'logtype <type|family|all> <on|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tracking', sub: 'logtype', description: 'Enable or disable one log event type', options: [{ type: 'string', name: 'type', description: 'Event type', required: true }, { type: 'string', name: 'state', description: 'on or off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const input = String(ctx.getText('type', 0) || '').trim();
        const state = String(ctx.getText('state', 1) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        if (['all', '*'].includes(String(input).toLowerCase())) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => setLogTypesState(guild, LOG_TYPE_CHOICES.map(([type]) => type), state === 'on'));
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Log types updated', `All log event types are now **${state}**.`)] });
        }
        const target = resolveLogTarget(input);
        const types = getTypesForLogTarget(target);
        if (!types.length) return ctx.invalidUsage('Available types: ' + LOG_TYPE_CHOICES.map(([value]) => `\`${value}\``).join(', '));
        ctx.store.updateGuild(ctx.guild.id, (guild) => setLogTypesState(guild, types, state === 'on'));
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Log type updated', `${target.label} is now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'logconfig',
      aliases: ['logsconfig', 'viewlogs'],
      category: 'Logs',
      description: 'Show the current log configuration',
      usage: 'logconfig',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'logconfig', description: 'Show the current log configuration' },
      async execute(ctx) {
        await ctx.reply({ embeds: [createLogsOverviewEmbed(ctx.guildConfig, ctx.prefix)] });
      }
    }),
    makeSimpleCommand({
      name: 'logtypes',
      aliases: ['logstypes', 'logslist', 'logevents'],
      category: 'Logs',
      description: 'Show every available log type grouped by family',
      usage: 'logtypes',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        await ctx.reply({ embeds: [createLogTypesEmbed(ctx.guildConfig, ctx.prefix)] });
      }
    }),
    makeSimpleCommand({
      name: 'logtest',
      aliases: ['logstest', 'testlogs'],
      category: 'Logs',
      description: 'Send one or more test logs to the configured routes',
      usage: 'logtest <type|all>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const input = String(ctx.getText('type', 0) || ctx.args[0] || 'all').toLowerCase();
        const logs = ctx.guildConfig.logs || { enabled: false, channelId: null, channels: {}, typeChannels: {}, types: {} };
        const targets = input === 'all'
          ? ['boost', 'join', 'ghostping', 'voiceJoin']
          : [...new Set((resolveLogTarget(input) ? getTypesForLogTarget(resolveLogTarget(input)) : []))];
        if (!targets.length) return ctx.invalidUsage(`Examples: \`${ctx.prefix}logtest boost\`, \`${ctx.prefix}logtest join\`, \`${ctx.prefix}logtest all\`.`);
        const results = [];
        for (const type of targets) {
          const channelId = getResolvedLogChannelId(logs, type);
          if (!channelId) {
            results.push(`• **${getLogTypeLabel(type)}** → no route set`);
            continue;
          }
          const channel = await ctx.guild.channels.fetch(channelId).catch(() => null);
          if (!isLogsTextChannel(channel)) {
            results.push(`• **${getLogTypeLabel(type)}** → invalid channel`);
            continue;
          }
          const sent = await channel.send({ embeds: [baseEmbed(ctx.guildConfig, `🧪 Test log • ${getLogTypeLabel(type)}`, `This is a manual test for **${type}**.
Route resolved to ${channel}.`)] }).catch(() => null);
          results.push(`• **${getLogTypeLabel(type)}** → ${sent ? channel.toString() : 'send failed'}`);
        }
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧾 Log test', results.join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'roles',
      aliases: ['rolehub', 'rolesetup', 'roleshelp'],
      category: 'Roles',
      description: 'Cleaner role hub for viewing, giving, removing, mass roles and member role inspection',
      usage: 'roles <view|user|add|remove|mass|autorole|all|panels|statusrole> [@user] [@role]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      async execute(ctx) {
        const sub = String(ctx.args[0] || 'view').toLowerCase();
        const render = (ids) => ids.length ? ids.map((roleId) => `<@&${roleId}>`).join(', ') : 'none';

        if (['view', 'list', 'show', 'help', 'status'].includes(sub)) {
          const statusRole = ctx.guildConfig.roles?.statusRole || {};
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Roles hub', [
            `**Auto roles (all):** ${render(ctx.guildConfig.roles?.autoRoles || [])}`,
            `**Auto roles (humans):** ${render(ctx.guildConfig.roles?.autoRolesHumans || [])}`,
            `**Auto roles (bots):** ${render(ctx.guildConfig.roles?.autoRolesBots || [])}`,
            `**Status role:** ${statusRole.roleId ? `<@&${statusRole.roleId}>` : 'off'}${statusRole.matchText ? ` • matches \`${statusRole.matchText}\`` : ''}`,
            '',
            `Quick examples:`,
            `• \`${ctx.prefix}roles user @user\``,
            `• \`${ctx.prefix}roles add @user @role\``,
            `• \`${ctx.prefix}roles remove @user @role\``,
            `• \`${ctx.prefix}roles mass add @Event humans\``,
            `• \`${ctx.prefix}autorole add @Member\``
          ].join('\n'))] });
        }

        if (sub === 'autorole') {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto role shortcuts', [
            `• \`${ctx.prefix}autorole view\``,
            `• \`${ctx.prefix}autorole add @Member\``,
            `• \`${ctx.prefix}autorole humans add @Member\``,
            `• \`${ctx.prefix}autorole bots add @Bot\``
          ].join('\n'))] });
        }

        if (sub === 'panels') {
          const buttonPanels = Object.keys(ctx.guildConfig.roles?.rolePanels || {}).length;
          const reactionPanels = Object.keys(ctx.guildConfig.roles?.reactionRoles || {}).length;
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Role panels', [
            `**Button panels:** ${buttonPanels}`,
            `**Reaction panels:** ${reactionPanels}`,
            '',
            `Use \`${ctx.prefix}reactbutton\` to create or update a button role panel.`,
            `Use role panel / reaction-role commands you already have to finish the setup.`
          ].join('\n'))] });
        }

        if (sub === 'statusrole') {
          const statusRole = ctx.guildConfig.roles?.statusRole || {};
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Status role', [
            `**Enabled:** ${statusRole.enabled ? 'on' : 'off'}`,
            `**Role:** ${statusRole.roleId ? `<@&${statusRole.roleId}>` : 'not set'}`,
            `**Match text:** ${statusRole.matchText ? `\`${statusRole.matchText}\`` : 'not set'}`,
            '',
            `Use \`${ctx.prefix}setstatusrole @Role text\` and \`${ctx.prefix}statusroleconfig\`.`
          ].join('\n'))] });
        }

        if (['all', 'mass'].includes(sub)) {
          const action = String(ctx.args[1] || '').toLowerCase();
          if (!action) {
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Mass role shortcuts', [
              `• \`${ctx.prefix}roleall add @Role\``,
              `• \`${ctx.prefix}roleall add @Role humans\``,
              `• \`${ctx.prefix}roleall remove @Role bots\``,
              `• \`${ctx.prefix}roles mass add @Role humans\``
            ].join('\n'))] });
          }
          const role = await ctx.getRole('role', 2);
          const scope = normalizeRoleScope(ctx.args[3]) || 'all';
          if (!['add', 'remove'].includes(action) || !role) {
            return ctx.invalidUsage(`Examples: \`${ctx.prefix}roles mass add @Role\`, \`${ctx.prefix}roles mass remove @Muted humans\`.`);
          }
          const result = await runMassRoleAction(ctx, action, role, scope);
          if (result.error) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Mass role', result.error)] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, action === 'add' ? '🎭 Role added to many members' : '🧹 Role removed from many members', [
            `**Action:** ${action}`,
            `**Role:** ${role}`,
            `**Scope:** ${scope}`,
            `**Members scanned:** ${result.members.length}`,
            `**Changed:** ${result.changed}`,
            `**Already good / skipped:** ${result.skipped}`,
            `**Failed:** ${result.failed}`
          ].join('\n'))] });
        }

        if (['user', 'member', 'target'].includes(sub)) {
          const target = await ctx.getMember('user', 1);
          if (!target) return ctx.invalidUsage(`Example: \`${ctx.prefix}roles user @user\``);
          const visibleRoles = [...target.roles.cache.values()].filter((role) => role.id !== ctx.guild.id).sort((a, b) => b.position - a.position);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, `🎭 Roles • ${target.user.tag}`, [
            `**Member:** ${target}`,
            `**Total roles:** ${visibleRoles.length}`,
            `**Top role:** ${target.roles.highest || 'none'}`,
            '',
            visibleRoles.length ? visibleRoles.map((role) => `• ${role}`).join('\n').slice(0, 3500) : 'No extra roles.'
          ].join('\n'))] });
        }

        if (!['add', 'remove', 'give', 'take'].includes(sub)) return ctx.invalidUsage();
        const target = await ctx.getMember('user', 1);
        const role = await ctx.getRole('role', 2);
        if (!target || !role) return ctx.invalidUsage(`Example: \`${ctx.prefix}roles add @user @role\``);
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Roles hub', 'You cannot manage that member.')] });
        if (ctx.guild.members.me?.roles.highest.position <= role.position) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Roles hub', 'Move the target role below my highest role first.')] });
        const add = ['add', 'give'].includes(sub);
        await (add ? target.roles.add(role, `DvL roles ${sub} by ${ctx.user.tag}`) : target.roles.remove(role, `DvL roles ${sub} by ${ctx.user.tag}`)).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, add ? '✅ Role added' : '🧹 Role removed', `${role} ${add ? 'added to' : 'removed from'} ${target}.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'autorole',
      aliases: ['autorolesetup', 'autoroleconfig'],
      category: 'Roles',
      description: 'Clean auto-role hub command with all / humans / bots groups',
      usage: 'autorole <view|add|remove|clear|humans add|humans remove|bots add|bots remove> [@role]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const first = String(ctx.args[0] || 'view').toLowerCase();
        const second = String(ctx.args[1] || '').toLowerCase();
        const scopedGroup = ['all', 'humans', 'bots'].includes(first) ? first : 'all';
        const action = scopedGroup === 'all' ? first : (second || 'view');
        const roleArgIndex = scopedGroup === 'all' ? 1 : 2;
        const role = await ctx.getRole('role', roleArgIndex);
        const mapKey = scopedGroup === 'all' ? 'autoRoles' : (scopedGroup === 'humans' ? 'autoRolesHumans' : 'autoRolesBots');
        const buckets = {
          all: ctx.guildConfig.roles?.autoRoles || [],
          humans: ctx.guildConfig.roles?.autoRolesHumans || [],
          bots: ctx.guildConfig.roles?.autoRolesBots || []
        };

        if (['view', 'list', 'show'].includes(action)) {
          const render = (title, ids) => ids.length ? ids.map((roleId) => `• <@&${roleId}>`).join('\n') : 'None';
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto roles', [
            `**All joins**\n${render('All joins', buckets.all)}`,
            '',
            `**Humans only**\n${render('Humans only', buckets.humans)}`,
            '',
            `**Bots only**\n${render('Bots only', buckets.bots)}`,
            '',
            `Examples: \`${ctx.prefix}autorole add @Member\` • \`${ctx.prefix}autorole humans add @Member\` • \`${ctx.prefix}autorole bots add @Bot\``
          ].join('\n'))] });
        }

        if (['clear', 'off', 'reset'].includes(action)) {
          const clearGroup = scopedGroup === 'all' ? (['humans', 'bots'].includes(second) ? second : 'all') : scopedGroup;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.roles.autoRoles = guild.roles.autoRoles || [];
            guild.roles.autoRolesHumans = guild.roles.autoRolesHumans || [];
            guild.roles.autoRolesBots = guild.roles.autoRolesBots || [];
            if (clearGroup === 'all') {
              guild.roles.autoRoles = [];
              guild.roles.autoRolesHumans = [];
              guild.roles.autoRolesBots = [];
            } else if (clearGroup === 'humans') {
              guild.roles.autoRolesHumans = [];
            } else if (clearGroup === 'bots') {
              guild.roles.autoRolesBots = [];
            }
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto roles', clearGroup === 'all' ? 'All auto roles were cleared.' : `Auto roles for **${clearGroup}** were cleared.`)] });
        }

        if (!role) return ctx.invalidUsage(`Examples: \`${ctx.prefix}autorole add @Member\`, \`${ctx.prefix}autorole humans add @Member\`, \`${ctx.prefix}autorole bots remove @Bot\`.`);

        if (action === 'add') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.roles.autoRoles = guild.roles.autoRoles || [];
            guild.roles.autoRolesHumans = guild.roles.autoRolesHumans || [];
            guild.roles.autoRolesBots = guild.roles.autoRolesBots || [];
            guild.roles[mapKey] = Array.from(new Set([...(guild.roles[mapKey] || []), role.id]));
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto roles', `${role} added to **${scopedGroup}** auto roles.`)] });
        }

        if (['remove', 'del', 'delete'].includes(action)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.roles.autoRoles = guild.roles.autoRoles || [];
            guild.roles.autoRolesHumans = guild.roles.autoRolesHumans || [];
            guild.roles.autoRolesBots = guild.roles.autoRolesBots || [];
            guild.roles[mapKey] = (guild.roles[mapKey] || []).filter((id) => id !== role.id);
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto roles', `${role} removed from **${scopedGroup}** auto roles.`)] });
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}autorole view\`, \`${ctx.prefix}autorole add @Member\`, \`${ctx.prefix}autorole humans add @Member\`, \`${ctx.prefix}autorole bots add @Bot\`.`);
      }
    }),
    makeSimpleCommand({
      name: 'roleall',
      aliases: ['addroleall', 'giveroleall', 'removeroleall', 'takeallrole', 'massrole'],
      category: 'Roles',
      description: 'Give or remove one role to everyone, humans only, or bots only',
      usage: 'roleall <add|remove|view> <@role> [all|humans|bots]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'roleall', description: 'Give or remove one role to many members at once', options: [
        { type: 'string', name: 'action', description: 'add or remove', required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }] },
        { type: 'role', name: 'role', description: 'Role to add or remove', required: true },
        { type: 'string', name: 'scope', description: 'all, humans, or bots', required: false, choices: [{ name: 'all', value: 'all' }, { name: 'humans', value: 'humans' }, { name: 'bots', value: 'bots' }] }
      ] },
      async execute(ctx) {
        let action = String(ctx.getText('action', 0) || '').toLowerCase();
        if (!action) {
          if (['addroleall', 'giveroleall'].includes(ctx.command.name)) action = 'add';
          if (['removeroleall', 'takeallrole'].includes(ctx.command.name)) action = 'remove';
        }
        if (!action && !ctx.interaction) action = String(ctx.args[0] || 'view').toLowerCase();
        if (['view', 'help', 'list'].includes(action)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Mass role', [
            `Quick examples:`,
            `• \`${ctx.prefix}roleall add @Role\``,
            `• \`${ctx.prefix}roleall add @Role humans\``,
            `• \`${ctx.prefix}roleall remove @Role bots\``
          ].join('\n'))] });
        }

        const roleArgIndex = ['addroleall', 'giveroleall', 'removeroleall', 'takeallrole'].includes(ctx.command.name) ? 0 : 1;
        const role = await ctx.getRole('role', roleArgIndex);
        const rawScope = ctx.getText('scope', 2) || ctx.args[2] || ctx.args[3] || 'all';
        const scope = normalizeRoleScope(rawScope) || 'all';
        if (!['add', 'remove'].includes(action) || !role) {
          return ctx.invalidUsage(`Examples: \`${ctx.prefix}roleall add @Member\`, \`${ctx.prefix}roleall remove @Muted humans\`, \`${ctx.prefix}addroleall @Event all\`.`);
        }

        const result = await runMassRoleAction(ctx, action, role, scope);
        if (result.error) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Role all', result.error)] });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, action === 'add' ? '🎭 Role added to many members' : '🧹 Role removed from many members', [
          `**Action:** ${action}`,
          `**Role:** ${role}`,
          `**Scope:** ${scope}`,
          `**Members scanned:** ${result.members.length}`,
          `**Changed:** ${result.changed}`,
          `**Already good / skipped:** ${result.skipped}`,
          `**Failed:** ${result.failed}`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'setprefix',
      aliases: ['prefix'],
      category: 'Config',
      description: 'Set the guild prefix',
      usage: 'setprefix <prefix>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'general', sub: 'setprefix', description: 'Set the guild prefix', options: [{ type: 'string', name: 'prefix', description: 'New prefix', required: true }] },
      async execute(ctx) {
        const prefix = ctx.getText('prefix', 0);
        if (!prefix || prefix.length > 5) return ctx.invalidUsage('Prefix must be 1 to 5 characters.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.prefix = prefix; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✨ Prefix updated', `New prefix: \`${prefix}\``)] });
      }
    }),
    makeSimpleCommand({
      name: 'setembedcolor',
      aliases: ['embedcolor', 'color'],
      category: 'Config',
      description: 'Set the default embed color',
      usage: 'setembedcolor <hex>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'general', sub: 'setembedcolor', description: 'Set the default embed color', options: [{ type: 'string', name: 'hex', description: 'Hex color', required: true }] },
      async execute(ctx) {
        const color = ensureHexColor(ctx.getText('hex', 0));
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.embedColor = color; return guild; });
        await ctx.reply({ embeds: [baseEmbed({ embedColor: color }, '🎨 Embed color updated', `New color: \`${color}\``)] });
      }
    }),

    makeSimpleCommand({
      name: 'setlanguage',
      aliases: ['language', 'lang'],
      category: 'Config',
      description: 'Set the bot language for this server',
      usage: 'setlanguage <en|fr|es>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'general', sub: 'setlanguage', description: 'Set the bot language', options: [{ type: 'string', name: 'language', description: 'Language code', required: true, choices: [{ name: 'English', value: 'en' }, { name: 'French', value: 'fr' }, { name: 'Spanish', value: 'es' }] }] },
      async execute(ctx) {
        const lang = (ctx.getText('language', 0) || '').toLowerCase();
        if (!['en', 'fr', 'es'].includes(lang)) return ctx.invalidUsage('Allowed values: `en`, `fr`, `es`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.language = lang; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🌐 Language updated', `Server language set to **${lang}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'permrole',
      aliases: ['setpermrole', 'permissionrole'],
      category: 'Permissions',
      description: 'Assign or clear the role used for a custom command permission level',
      usage: 'permrole <1-5> <@role|clear>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'perms', sub: 'permrole', description: 'Set the role for a custom permission level', options: [{ type: 'integer', name: 'level', description: 'Permission level', required: true, minValue: 1, maxValue: 5 }, { type: 'role', name: 'role', description: 'Role', required: false }] },
      async execute(ctx) {
        const level = String(ctx.getText('level', 0) || '').trim();
        const role = await ctx.getRole('role', 1);
        const raw = (ctx.interaction ? null : ctx.args[1]) || '';
        if (!['1', '2', '3', '4', '5'].includes(level)) return ctx.invalidUsage('Level must be between `1` and `5`.');
        const clear = !role && ['clear', 'none', 'off', 'remove'].includes(String(raw).toLowerCase());
        if (!role && !clear) return ctx.invalidUsage('Use a role mention or `clear`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.permissions.levels[level] = guild.permissions.levels[level] || { roleId: null, commands: [] };
          guild.permissions.levels[level].roleId = clear ? null : role.id;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔐 Permission role', clear ? `Level **${level}** role cleared.` : `Level **${level}** now uses ${role}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'permcmd',
      aliases: ['permissioncmd', 'permcommand'],
      category: 'Permissions',
      description: 'Allow or remove a command from a custom permission level',
      usage: 'permcmd <1-5> <add|remove> <command>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'perms', sub: 'permcmd', description: 'Manage commands allowed for a permission level', options: [{ type: 'integer', name: 'level', description: 'Permission level', required: true, minValue: 1, maxValue: 5 }, { type: 'string', name: 'action', description: 'add or remove', required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }] }, { type: 'string', name: 'command', description: 'Command name or alias', required: true }] },
      async execute(ctx) {
        const level = String(ctx.getText('level', 0) || '').trim();
        const action = String(ctx.getText('action', 1) || '').toLowerCase();
        const name = String(ctx.getText('command', 2) || '').replace(/^[+/]/, '').toLowerCase();
        if (!['1', '2', '3', '4', '5'].includes(level)) return ctx.invalidUsage('Level must be between `1` and `5`.');
        if (!['add', 'remove'].includes(action)) return ctx.invalidUsage();
        const target = ctx.client.commandRegistry.find((cmd) => cmd.name === name || (cmd.aliases || []).includes(name));
        if (!target) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔐 Permission command', `Unknown command or alias: \`${name}\`.`)] });
        if (target.ownerOnly) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔐 Permission command', 'Owner-only commands cannot be assigned to permission levels.')] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.permissions.levels[level] = guild.permissions.levels[level] || { roleId: null, commands: [] };
          const list = new Set(guild.permissions.levels[level].commands || []);
          if (action === 'add') list.add(target.name);
          else list.delete(target.name);
          guild.permissions.levels[level].commands = [...list].sort();
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔐 Permission command', `Level **${level}** will ${action === 'add' ? 'now' : 'no longer'} allow \`${target.name}\`.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'permconfig',
      aliases: ['permissions', 'perms', 'permissionconfig'],
      category: 'Permissions',
      description: 'Show the custom permission level setup',
      usage: 'permconfig',
      guildOnly: true,
      slash: { root: 'perms', sub: 'permconfig', description: 'Show the custom permission level setup' },
      async execute(ctx) {
        const levels = ctx.guildConfig.permissions?.levels || {};
        const lines = ['Custom permission levels let a role use specific bot commands even if you want a smaller bot-access setup.'];
        for (const level of ['1', '2', '3', '4', '5']) {
          const entry = levels[level] || { roleId: null, commands: [] };
          lines.push(`\n**Level ${level}**`);
          lines.push(`Role: ${entry.roleId ? `<@&${entry.roleId}>` : 'none'}`);
          lines.push(`Commands: ${(entry.commands || []).length ? entry.commands.map((cmd) => code(`${ctx.prefix}${cmd}`)).join(', ') : 'none'}`);
        }
        lines.push('\nExample: ' + code(`${ctx.prefix}permrole 1 @JuniorMods`) + ' then ' + code(`${ctx.prefix}permcmd 1 add timeout`) + '.');
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔐 Permission setup', lines.join('\n').slice(0, 4000))] });
      }
    }),
    makeSimpleCommand({
      name: 'say',
      aliases: ['echo'],
      category: 'Utility',
      description: 'Send a normal message through the bot',
      usage: 'say <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'say', description: 'Send a normal message through the bot', options: [{ type: 'string', name: 'text', description: 'Text', required: true }] },
      async execute(ctx) {
        const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!text) return ctx.invalidUsage();
        if (ctx.message) await ctx.message.delete().catch(() => null);
        await ctx.channel.send({ content: text });
      }
    }),
    makeSimpleCommand({
      name: 'backup',
      aliases: ['backupconfig', 'serverbackup', 'bk', 'backupview', 'backuplatest'],
      category: 'System',
      description: 'Create, import, list, restore, export or delete server backups',
      usage: 'backup <create|list|load|info|export|delete|import> [id] [name]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: {
        root: 'utility',
        sub: 'backup',
        description: 'Manage server backups for this server',
        options: [
          {
            type: 'string',
            name: 'action',
            description: 'Backup action',
            required: true,
            choices: [
              { name: 'create', value: 'create' },
              { name: 'list', value: 'list' },
              { name: 'info', value: 'info' },
              { name: 'restore', value: 'restore' },
              { name: 'export', value: 'export' },
              { name: 'delete', value: 'delete' },
              { name: 'import', value: 'import' }
            ]
          },
          { type: 'string', name: 'id', description: 'Backup id', required: false },
          { type: 'string', name: 'name', description: 'Optional backup name', required: false }
        ]
      },
      async execute(ctx) {
        const rawAction = ctx.getText('action', 0);
        if (!ctx.interaction && !rawAction && !ctx.args.length) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup hub', [
            `Quick examples:`,
            `• \`${ctx.prefix}backup create\``,
            `• \`${ctx.prefix}backup create my-main\``,
            `• \`${ctx.prefix}backup list\``,
            `• \`${ctx.prefix}backup load latest\``,
            `• \`${ctx.prefix}backup info <id>\``
          ].join('\n'))] });
        }
        const action = String(rawAction || ctx.args[0] || 'list').toLowerCase();
        const rawId = String(ctx.getText('id', 1) || (!ctx.interaction ? (ctx.args[1] || '') : '')).trim();
        const nameArg = ctx.interaction
          ? String(ctx.interaction.options.getString('name') || '').trim()
          : String(['create', 'save', 'make'].includes(action) ? (ctx.getRest(1) || '') : (ctx.getRest(2) || '')).trim();
        const backups = getGlobalBackups(ctx.store);

        if (['create', 'save', 'make'].includes(action)) {
          const { snapshot, meta } = buildGuildBackupSnapshot(ctx.guildConfig, ctx.guild);
          const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          const entry = {
            id,
            name: String(nameArg || `${ctx.guild.name}-${new Date().toISOString().slice(0, 10)}`).slice(0, 60),
            createdAt: new Date().toISOString(),
            createdBy: ctx.user.id,
            sourceGuildId: ctx.guild.id,
            sourceGuildName: ctx.guild.name,
            snapshot,
            meta
          };
          saveGlobalBackups(ctx.store, (items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup created', [
            `**ID:** \`${id}\``,
            `**Name:** ${entry.name}`,
            `**Source server:** **${ctx.guild.name}**`,
            `**Stored backups:** **${Math.min(backups.length + 1, 50)}**/50`,
            `**Structure:** ${meta.channels} channels • ${meta.roles} roles • ${meta.members} members`,
            '',
            `Use \`${ctx.prefix}backup list\` anywhere, then \`${ctx.prefix}backup load ${id}\` on another server.`
          ].join('\n'))] });
        }

        if (action === 'import') {
          const attachment = await resolveBackupAttachment(ctx);
          if (!attachment?.url) {
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup import', `Attach a backup JSON file to the command message, or reply to a message that contains one.
Example: \`${ctx.prefix}backup import imported-main\``)] });
          }
          const response = await axios.get(attachment.url, { timeout: 20000 });
          const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          const importedSnapshot = parsed.snapshot || parsed;
          if (!importedSnapshot || typeof importedSnapshot !== 'object') {
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup import', 'That file does not look like a valid DvL backup JSON.')] });
          }
          const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          const entry = {
            id,
            name: String(nameArg || rawId || parsed.name || attachment.name || 'imported-backup').slice(0, 60),
            createdAt: new Date().toISOString(),
            createdBy: ctx.user.id,
            sourceGuildId: parsed.sourceGuildId || null,
            sourceGuildName: parsed.sourceGuildName || parsed.snapshot?.server?.name || 'Imported backup',
            snapshot: importedSnapshot,
            meta: parsed.meta || {
              channels: importedSnapshot.structure?.channels?.length || 0,
              roles: importedSnapshot.structure?.roles?.length || 0,
              members: 0,
              backupVersion: 2
            }
          };
          saveGlobalBackups(ctx.store, (items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup imported', `Imported **${entry.name}** as \`${entry.id}\`.
You can now run \`${ctx.prefix}backup load ${entry.id}\` on any server where the bot has **Manage Server**.`)] });
        }

        if (['list', 'ls', 'view', 'show'].includes(action)) {
          return ctx.reply({ embeds: buildBackupListEmbeds(ctx, backups) });
        }

        const found = resolveGlobalBackupEntry(backups, rawId || (['latest', 'last'].includes(action) ? 'latest' : ''));
        if (!found && !['create', 'save', 'make', 'import', 'list', 'ls', 'view', 'show'].includes(action)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup', `No global backup found with id or name \`${rawId || 'latest'}\`.`)] });
        }

        if (['latest', 'last', 'recent'].includes(action)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Latest backup', [
            `**ID:** \`${found.id}\``,
            `**Name:** ${found.name || 'Unnamed'}`,
            `**Source server:** **${found.sourceGuildName || 'Unknown'}**`,
            `**Created:** <t:${Math.floor(new Date(found.createdAt).getTime() / 1000)}:F>`,
            `Use \`${ctx.prefix}backup load ${found.id}\` to restore it here.`
          ].join('\n'))] });
        }

        if (['info', 'showone', 'inspect'].includes(action)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💾 Backup info', [
            `**ID:** \`${found.id}\``,
            `**Name:** ${found.name || 'Unnamed'}`,
            `**Created:** <t:${Math.floor(new Date(found.createdAt).getTime() / 1000)}:F>`,
            `**By:** <@${found.createdBy}>`,
            `**Source server:** **${found.sourceGuildName || found.snapshot?.server?.name || 'unknown'}**`,
            `**Channels at save:** ${found.meta?.channels || 0}`,
            `**Roles at save:** ${found.meta?.roles || 0}`,
            `**Members at save:** ${found.meta?.members || 0}`,
            `**Backup version:** ${found.meta?.backupVersion || 1}`
          ].join('\n'))] });
        }

        if (['export', 'download'].includes(action)) {
          const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(found, null, 2), 'utf8'), { name: `dvl-backup-${found.id}.json` });
          return ctx.reply({
            embeds: [baseEmbed(ctx.guildConfig, '💾 Backup export', `Exported backup \`${found.id}\` as a JSON file.`)],
            files: [attachment]
          });
        }

        if (['delete', 'remove'].includes(action)) {
          saveGlobalBackups(ctx.store, (items) => items.filter((entry) => entry.id !== found.id));
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🗑️ Backup deleted', `Removed backup \`${found.id}\` (**${found.name || 'Unnamed'}**).`)] });
        }

        if (['restore', 'load', 'apply'].includes(action)) {
          await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '♻️ Backup restore started', 'Starting a clean restore. Old channels and roles will be replaced where possible. This can take a bit on bigger servers.')] });
          const { createdRoles, createdChannels } = await applyBackupStructure(ctx.guild, found.snapshot || {});
          const mappedSnapshot = remapSnapshotIds(found.snapshot || {}, createdRoles, createdChannels);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            const keepWarnings = guild.moderation?.warnings || {};
            const keepReminders = guild.reminders || [];
            const keepGiveaways = guild.giveaways || {};
            const keepAfk = guild.afk || {};
            const keepInviteCodes = guild.invites?.codes || {};
            const restored = cloneJson(mappedSnapshot || {});
            for (const [key, value] of Object.entries(restored)) {
              if (['structure', 'server', 'refNames'].includes(key)) continue;
              guild[key] = value;
            }
            guild.reminders = keepReminders;
            guild.giveaways = keepGiveaways;
            guild.afk = keepAfk;
            guild.moderation = guild.moderation || {};
            guild.moderation.warnings = keepWarnings;
            guild.invites = guild.invites || {};
            guild.invites.codes = keepInviteCodes;
            guild.roles.rolePanels = {};
            guild.roles.reactionRoles = {};
            return guild;
          });
          const targetChannel = [...createdChannels.values()].find((ch) => ch.isTextBased?.()) || ctx.guild.systemChannel || null;
          if (targetChannel?.isTextBased?.()) {
            await targetChannel.send({ embeds: [baseEmbed(mappedSnapshot || ctx.guildConfig, '♻️ Backup restored', [
              `Loaded **${found.name || found.id}** onto **${ctx.guild.name}**.`,
              `Source server: **${found.sourceGuildName || found.snapshot?.server?.name || 'Unknown'}**`,
              `Created roles: **${createdRoles.size}**`,
              `Created channels: **${createdChannels.size}**`,
              '',
              'Notes:',
              '• old channels were removed before restoring the saved structure',
              '• saved server name/icon were applied when possible',
              '• role panels and reaction-role message links were reset to avoid broken old message IDs'
            ].join('\n'))] }).catch(() => null);
          }
          return null;
        }

        return ctx.invalidUsage(`Try \`${ctx.prefix}backup create\`, \`${ctx.prefix}backup list\` or \`${ctx.prefix}backup load latest\`.`);
      }
    }),
    makeSimpleCommand({
      name: 'createemoji',
      aliases: ['addemoji', 'stealemoji', 'emojiadd'],
      category: 'Utility',
      description: 'Create a server emoji from a custom emoji or image URL',
      usage: 'createemoji <emoji|url> [name]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuildExpressions ?? PermissionFlagsBits.ManageEmojisAndStickers],
      slash: {
        root: 'utility',
        sub: 'createemoji',
        description: 'Create a server emoji from a custom emoji or image URL',
        options: [
          { type: 'string', name: 'source', description: 'Custom emoji or image URL', required: true },
          { type: 'string', name: 'name', description: 'Emoji name', required: false }
        ]
      },
      async execute(ctx) {
        const source = ctx.getText('source', 0);
        const customName = ctx.interaction ? ctx.interaction.options.getString('name') : ctx.getRest(1);
        if (!source) return ctx.invalidUsage('Example: `+createemoji <:blob:123456789012345678> blob`');

        const me = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
        const manageExpressions = PermissionFlagsBits.ManageGuildExpressions ?? PermissionFlagsBits.ManageEmojisAndStickers;
        if (!me?.permissions.has(manageExpressions)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Emoji create', 'I need the **Manage Expressions** permission to create emojis.')] });
        }

        const match = String(source).trim().match(/^<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>$/);
        let url = null;
        let fallbackName = null;
        if (match) {
          const animated = Boolean(match[1]);
          fallbackName = match[2];
          const id = match[3];
          url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?quality=lossless`;
        } else if (/^https?:\/\//i.test(String(source).trim())) {
          url = String(source).trim();
        } else {
          return ctx.invalidUsage('Use a **custom emoji** like `:emoji:` / `<:name:id>` or a direct image URL.');
        }

        const requestedName = String(customName || fallbackName || 'emoji').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 32);
        const finalName = requestedName.length >= 2 ? requestedName : 'emoji';

        try {
          const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 5 });
          const created = await ctx.guild.emojis.create({ attachment: Buffer.from(response.data), name: finalName });
          await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '😀 Emoji created', `Created ${created} as **${created.name}**.`).setThumbnail(created.imageURL())] });
        } catch (error) {
          const message = String(error?.response?.data?.message || error?.rawError?.message || error?.message || error);
          await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Emoji create failed', [
            'Could not create that emoji.',
            '',
            'Checks:',
            '• the image URL/custom emoji is valid',
            '• the server still has free emoji slots',
            '• the bot has **Manage Expressions**',
            '',
            code(message.slice(0, 1000))
          ].join('\n'))] });
        }
      }
    }),
    makeSimpleCommand({
      name: 'poll',
      aliases: ['vote'],
      category: 'Utility',
      description: 'Create a quick poll',
      usage: 'poll <question>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'poll', description: 'Create a quick poll', options: [{ type: 'string', name: 'question', description: 'Question', required: true }] },
      async execute(ctx) {
        const question = ctx.interaction ? ctx.interaction.options.getString('question') : ctx.getRest(0);
        if (!question) return ctx.invalidUsage();
        const sent = await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Poll', question)] });
        await sent.react('👍').catch(() => null);
        await sent.react('👎').catch(() => null);
      }
    }),
    makeSimpleCommand({
      name: 'profile',
      aliases: ['profil', 'userprofile', 'user', 'whois'],
      category: 'Utility',
      description: 'Show a clean server profile card with invites, warnings and useful account info',
      usage: 'profile [@user]',
      guildOnly: true,
      slash: { root: 'utility', sub: 'profile', description: 'Show a server profile card', options: [{ type: 'user', name: 'user', description: 'Target member', required: false }] },
      async execute(ctx) {
        const target = await ctx.getMember('user', 0) || ctx.member;
        if (!target) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👤 Profile', 'User not found.')] });
        await ctx.reply({ embeds: [createUserProfileEmbed(ctx.guildConfig, ctx.guild, target)] });
      }
    }),
    makeSimpleCommand({
      name: 'embed',
      aliases: ['embedbuilder', 'eb'],
      category: 'Utility',
      description: 'Open an interactive embed builder',
      usage: 'embed',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'embed', description: 'Open an interactive embed builder' },
      async execute(ctx) {
        const draftId = crypto.randomBytes(8).toString('hex');
        const preview = new EmbedBuilder()
          .setColor(ensureHexColor(ctx.guildConfig.embedColor))
          .setTitle('Embed builder')
          .setDescription('Use the buttons below to edit and send your embed.')
          .setFooter({ text: 'DvL embed builder' })
          .setTimestamp();

        ctx.client.embedDrafts.set(draftId, {
          id: draftId,
          ownerId: ctx.user.id,
          channelId: ctx.channel.id,
          embed: {
            color: ctx.guildConfig.embedColor,
            title: 'Embed builder',
            description: 'Use the buttons below to edit and send your embed.'
          }
        });

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`embed:title:${draftId}`).setLabel('Title').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`embed:description:${draftId}`).setLabel('Description').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`embed:author:${draftId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`embed:footer:${draftId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`embed:color:${draftId}`).setLabel('Color').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`embed:image:${draftId}`).setLabel('Image').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`embed:thumbnail:${draftId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`embed:send:${draftId}`).setLabel('Send').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`embed:cancel:${draftId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        await ctx.reply({ embeds: [preview], components: [row1, row2] });
      }
    }),
    makeSimpleCommand({
      name: 'remind',
      aliases: ['reminder', 'timer'],
      category: 'Utility',
      description: 'Create a reminder',
      usage: 'remind <time> <text>',
      dmAllowed: true,
      slash: { root: 'utility', sub: 'remind', description: 'Create a reminder', options: [{ type: 'string', name: 'time', description: 'Example: 10m', required: true }, { type: 'string', name: 'text', description: 'Reminder text', required: true }] },
      async execute(ctx) {
        const timeRaw = ctx.getText('time', 0);
        const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.args.slice(1).join(' ');
        const duration = parseDuration(timeRaw);
        if (!duration || !text) return ctx.invalidUsage('Example: `+remind 10m drink water`');
        const guildId = ctx.guild?.id || 'dm';
        ctx.store.updateGuild(guildId, (guild) => {
          guild.reminders.push({ id: crypto.randomBytes(5).toString('hex'), userId: ctx.user.id, channelId: ctx.channel?.id || null, text, dueAt: Date.now() + duration });
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏰ Reminder created', `I will remind you in **${formatDuration(duration)}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'calc',
      aliases: ['math'],
      category: 'Utility',
      description: 'Evaluate a basic math expression',
      usage: 'calc <expression>',
      dmAllowed: true,
      slash: { root: 'utility', sub: 'calc', description: 'Evaluate a basic math expression', options: [{ type: 'string', name: 'expression', description: 'Expression', required: true }] },
      async execute(ctx) {
        const expr = ctx.interaction ? ctx.interaction.options.getString('expression') : ctx.getRest(0);
        if (!expr) return ctx.invalidUsage();
        if (!/^[\d+\-*/().,%\s]+$/.test(expr)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Calc', 'Only basic math characters are allowed.')] });
        try {
          const result = Function(`"use strict"; return (${expr.replace(/%/g, '/100')});`)();
          await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧮 Calc', `\`${expr}\` = **${result}**`)] });
        } catch {
          await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Calc', 'Invalid expression.')] });
        }
      }
    }),
    makeSimpleCommand({
      name: 'avatar',
      aliases: ['pfp'],
      category: 'Info',
      description: 'Show a user avatar',
      usage: 'avatar [@member]',
      dmAllowed: true,
      slash: { root: 'info', sub: 'avatar', description: 'Show a user avatar', options: [{ type: 'user', name: 'target', description: 'Target user', required: false }] },
      async execute(ctx) {
        const user = ctx.interaction ? (ctx.interaction.options.getUser('target') || ctx.user) : (ctx.message?.mentions.users.first() || ctx.user);
        const embed = baseEmbed(ctx.guildConfig, '🖼️ Avatar', `${user}`).setImage(user.displayAvatarURL({ size: 4096 }));
        await ctx.reply({ embeds: [embed] });
      }
    }),
    makeSimpleCommand({
      name: 'banner',
      aliases: [],
      category: 'Info',
      description: 'Show a user banner',
      usage: 'banner [@member]',
      dmAllowed: true,
      slash: { root: 'info', sub: 'banner', description: 'Show a user banner', options: [{ type: 'user', name: 'target', description: 'Target user', required: false }] },
      async execute(ctx) {
        const user = ctx.interaction ? (ctx.interaction.options.getUser('target') || ctx.user) : (ctx.message?.mentions.users.first() || ctx.user);
        const fetched = await user.fetch(true);
        const banner = fetched.bannerURL({ size: 4096 });
        if (!banner) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Banner', 'No banner found for that user.')] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🪄 Banner', `${user}`).setImage(banner)] });
      }
    }),
    makeSimpleCommand({
      name: 'userinfo',
      aliases: ['ui'],
      category: 'Info',
      description: 'Show member information',
      usage: 'userinfo [@member]',
      guildOnly: true,
      slash: { root: 'info', sub: 'userinfo', description: 'Show member information', options: [{ type: 'user', name: 'target', description: 'Target member', required: false }] },
      async execute(ctx) {
        const member = ctx.interaction ? (ctx.interaction.options.getMember('target') || ctx.member) : (ctx.message?.mentions.members.first() || ctx.member);
        const embed = baseEmbed(ctx.guildConfig, '👤 User Info', `${member}`)
          .addFields(
            { name: 'ID', value: code(member.id), inline: true },
            { name: 'Account created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
            { name: 'Joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
            { name: 'Roles', value: member.roles.cache.filter((role) => role.id !== ctx.guild.id).map((role) => role.toString()).join(', ').slice(0, 1000) || 'None', inline: false }
          )
          .setThumbnail(member.displayAvatarURL());
        await ctx.reply({ embeds: [embed] });
      }
    }),
    makeSimpleCommand({
      name: 'serverinfo',
      aliases: ['si'],
      category: 'Info',
      description: 'Show server information',
      usage: 'serverinfo',
      guildOnly: true,
      slash: { root: 'info', sub: 'serverinfo', description: 'Show server information' },
      async execute(ctx) {
        const g = ctx.guild;
        const embed = baseEmbed(ctx.guildConfig, '🏰 Server Info', `**Name:** ${g.name}\n**ID:** ${code(g.id)}\n**Members:** ${g.memberCount}\n**Channels:** ${g.channels.cache.size}\n**Roles:** ${g.roles.cache.size}\n**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:F>`);
        if (g.iconURL()) embed.setThumbnail(g.iconURL({ size: 4096 }));
        await ctx.reply({ embeds: [embed] });
      }
    }),
    makeSimpleCommand({
      name: 'roleinfo',
      aliases: ['ri'],
      category: 'Info',
      description: 'Show role information',
      usage: 'roleinfo <@role|id>',
      guildOnly: true,
      slash: { root: 'info', sub: 'roleinfo', description: 'Show role information', options: [{ type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        if (!role) return ctx.invalidUsage();
        const embed = baseEmbed(ctx.guildConfig, '🎭 Role Info', `${role}`)
          .addFields(
            { name: 'ID', value: code(role.id), inline: true },
            { name: 'Color', value: code(role.hexColor), inline: true },
            { name: 'Members', value: String(role.members.size), inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false }
          );
        await ctx.reply({ embeds: [embed] });
      }
    }),
    makeSimpleCommand({
      name: 'channelinfo',
      aliases: ['ci'],
      category: 'Info',
      description: 'Show channel information',
      usage: 'channelinfo [#channel]',
      guildOnly: true,
      slash: { root: 'info', sub: 'channelinfo', description: 'Show channel information', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: false }] },
      async execute(ctx) {
        const channel = ctx.interaction ? (ctx.interaction.options.getChannel('channel') || ctx.channel) : (ctx.message?.mentions.channels.first() || ctx.channel);
        const embed = baseEmbed(ctx.guildConfig, '📌 Channel Info', `${channel}`)
          .addFields(
            { name: 'ID', value: code(channel.id), inline: true },
            { name: 'Type', value: channelTypeName(channel), inline: true },
            { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true }
          );
        await ctx.reply({ embeds: [embed] });
      }
    }),

    makeSimpleCommand({
      name: 'stickyset',
      aliases: ['sticky', 'setsticky'],
      category: 'Automation',
      description: 'Pin a sticky message that re-posts at the bottom of the channel',
      usage: 'stickyset <message>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'stickyset', description: 'Set a sticky message', options: [{ type: 'string', name: 'message', description: 'Sticky message', required: true }] },
      async execute(ctx) {
        const stickyText = (ctx.interaction ? ctx.interaction.options.getString('message') : ctx.getRest(0) || '').trim();
        if (!stickyText) return ctx.invalidUsage();
        const previous = ctx.guildConfig.sticky?.[ctx.channel.id];
        if (previous?.lastNoticeId) {
          await ctx.channel.messages.fetch(previous.lastNoticeId).then((msg) => msg.delete().catch(() => null)).catch(() => null);
        }
        const sent = await ctx.channel.send({ embeds: [baseEmbed(ctx.guildConfig, '📌 Sticky message', stickyText)] }).catch(() => null);
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.sticky = guild.sticky || {};
          guild.sticky[ctx.channel.id] = {
            message: stickyText,
            lastNoticeId: sent?.id || null,
            createdBy: ctx.user.id,
            updatedAt: Date.now()
          };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Sticky saved', `Sticky message active in ${ctx.channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'stickyoff',
      aliases: ['unsticky', 'stickyclear'],
      category: 'Automation',
      description: 'Disable the sticky message in a channel',
      usage: 'stickyoff [#channel]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'stickyoff', description: 'Disable a sticky message', options: [{ type: 'channel', name: 'channel', description: 'Target channel', required: false, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0) || ctx.channel;
        const current = ctx.guildConfig.sticky?.[channel.id];
        if (!current) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Sticky', `No sticky message is active in ${channel}.`)] });
        if (current.lastNoticeId && channel.isTextBased?.()) {
          await channel.messages.fetch(current.lastNoticeId).then((msg) => msg.delete().catch(() => null)).catch(() => null);
        }
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.sticky = guild.sticky || {};
          delete guild.sticky[channel.id];
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Sticky disabled', `Sticky message removed from ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'stickyconfig',
      aliases: ['stickylist'],
      category: 'Automation',
      description: 'Show all active sticky messages',
      usage: 'stickyconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'utility', sub: 'stickyconfig', description: 'Show sticky message config' },
      async execute(ctx) {
        const entries = Object.entries(ctx.guildConfig.sticky || {});
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📌 Sticky messages', entries.length ? entries.map(([channelId, entry]) => `**<#${channelId}>**
${clipText(entry.message, 160)}`).join('\n\n') : 'No sticky messages configured.')] });
      }
    }),
    makeSimpleCommand({
      name: 'autoreact',
      aliases: ['reactauto', 'autorea', 'areact'],
      category: 'Automation',
      description: 'Configure automatic reactions for one or more channels',
      usage: 'autoreact <add|set|remove|on|off|mode|count|chance|cooldown|bots|trigger|preset|config> [#channel] [value]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: {
        root: 'utility',
        sub: 'autoreact',
        description: 'Configure auto reactions for a channel',
        options: [
          { type: 'string', name: 'action', description: 'What to change', required: true, choices: [
            { name: 'add', value: 'add' },
            { name: 'set', value: 'set' },
            { name: 'remove', value: 'remove' },
            { name: 'on', value: 'on' },
            { name: 'off', value: 'off' },
            { name: 'mode', value: 'mode' },
            { name: 'count', value: 'count' },
            { name: 'chance', value: 'chance' },
            { name: 'cooldown', value: 'cooldown' },
            { name: 'bots', value: 'bots' },
            { name: 'trigger', value: 'trigger' },
            { name: 'preset', value: 'preset' },
            { name: 'config', value: 'config' }
          ] },
          { type: 'channel', name: 'channel', description: 'Target channel', required: false, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] },
          { type: 'string', name: 'value', description: 'Emojis or value', required: false }
        ]
      },
      async execute(ctx) {
        const action = String(ctx.getText('action', 0) || 'config').toLowerCase();
        const configActionsWithoutChannel = ['config', 'list'];
        const channel = await ctx.getChannel('channel', 1) || (!configActionsWithoutChannel.includes(action) ? null : null);
        const value = String(ctx.interaction ? (ctx.interaction.options.getString('value') || '') : (ctx.args.slice(2).join(' ') || '')).trim();
        const currentChannel = channel || ctx.channel;

        if (['config', 'list'].includes(action)) {
          const targetChannel = channel || (ctx.interaction ? null : await ctx.getChannel('channel', 1)) || null;
          const entries = Object.entries(ctx.guildConfig.autoReact?.channels || {});
          if (targetChannel) {
            const entry = ctx.guildConfig.autoReact?.channels?.[targetChannel.id];
            return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, targetChannel, entry)] });
          }
          return ctx.reply({ embeds: [buildAutoReactOverviewEmbed(ctx.guildConfig, ctx.guild, entries)] });
        }

        if (!channel) return ctx.invalidUsage('You need to target a text channel. Example: `+autoreact add #general 🔥 😂`');

        if (['add', 'set', 'remove'].includes(action)) {
          const emojis = parseAutoReactEmojiList(value);
          if (!emojis.length) return ctx.invalidUsage('Give at least one emoji. Example: `+autoreact add #general 🔥 😂`');
          let next = null;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            const pool = new Set(action === 'set' ? [] : current.emojis || []);
            if (action === 'remove') {
              for (const emoji of emojis) pool.delete(emoji);
            } else {
              for (const emoji of emojis) pool.add(emoji);
            }
            current.emojis = [...pool].slice(0, 12);
            current.enabled = action === 'remove' ? current.enabled : true;
            if (!current.emojis.length && action === 'remove') current.enabled = false;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, action === 'remove' ? 'Auto-react list updated.' : 'Auto-react saved.')] });
        }

        if (action === 'preset') {
          const presetKey = value.toLowerCase();
          const preset = AUTO_REACT_PRESETS[presetKey];
          if (!preset) return ctx.invalidUsage(`Available presets: ${Object.keys(AUTO_REACT_PRESETS).map((key) => `\`${key}\``).join(', ')}`);
          let next = null;
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.enabled = true;
            current.emojis = [...preset.emojis];
            current.mode = preset.mode;
            current.maxReactions = preset.maxReactions;
            current.chance = preset.chance;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Preset **${presetKey}** applied.`)] });
        }

        let next = null;
        if (action === 'on' || action === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.enabled = action === 'on';
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Auto-react is now **${action}** in ${channel}.`)] });
        }

        if (action === 'mode') {
          const mode = value.toLowerCase();
          if (!['random', 'all', 'rotate'].includes(mode)) return ctx.invalidUsage('Allowed modes: `random`, `all`, `rotate`.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.mode = mode;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Mode set to **${mode}**.`)] });
        }

        if (action === 'count') {
          const count = Number.parseInt(value, 10);
          if (!Number.isInteger(count) || count < 1 || count > 5) return ctx.invalidUsage('Count must be between `1` and `5`.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.maxReactions = count;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `The bot will add up to **${count}** reaction(s).`)] });
        }

        if (action === 'chance') {
          const chance = Number.parseInt(value, 10);
          if (!Number.isInteger(chance) || chance < 1 || chance > 100) return ctx.invalidUsage('Chance must be between `1` and `100`.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.chance = chance;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Chance set to **${chance}%**.`)] });
        }

        if (action === 'cooldown') {
          const seconds = Number.parseInt(value, 10);
          if (!Number.isInteger(seconds) || seconds < 0 || seconds > 300) return ctx.invalidUsage('Cooldown must be between `0` and `300` seconds.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.cooldownSeconds = seconds;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Cooldown set to **${seconds}s**.`)] });
        }

        if (action === 'bots') {
          const state = value.toLowerCase();
          if (!['on', 'off'].includes(state)) return ctx.invalidUsage('Use `on` or `off`.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.allowBots = state === 'on';
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, `Bot messages are now **${state === 'on' ? 'allowed' : 'ignored'}**.`)] });
        }

        if (action === 'trigger') {
          const triggers = parseAutoReactTriggerList(value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.autoReact = guild.autoReact || { channels: {} };
            const current = normalizeAutoReactEntry(guild.autoReact.channels[channel.id]);
            current.triggerWords = triggers;
            guild.autoReact.channels[channel.id] = current;
            next = current;
            return guild;
          });
          return ctx.reply({ embeds: [buildAutoReactConfigEmbed(ctx.guildConfig, channel, next, triggers.length ? `Trigger words saved (${triggers.length}).` : 'Trigger filter cleared.')] });
        }

        return ctx.invalidUsage('Actions: `add`, `set`, `remove`, `on`, `off`, `mode`, `count`, `chance`, `cooldown`, `bots`, `trigger`, `preset`, `config`.');
      }
    }),

    makeSimpleCommand({
      name: 'afk',
      aliases: [],
      category: 'Utility',
      description: 'Set yourself as AFK',
      usage: 'afk [reason]',
      guildOnly: true,
      slash: { root: 'utility', sub: 'afk', description: 'Set yourself as AFK', options: [{ type: 'string', name: 'reason', description: 'Reason', required: false }] },
      async execute(ctx) {
        const reason = (ctx.interaction ? ctx.interaction.options.getString('reason') : ctx.getRest(0)) || 'AFK';
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.afk[ctx.user.id] = { reason, since: Date.now() };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💤 AFK set', `${ctx.user}, reason: **${reason}**`)] });
      }
    }),
    makeSimpleCommand({
      name: 'snipe',
      aliases: [],
      category: 'Utility',
      description: 'Show the last deleted message in the channel',
      usage: 'snipe',
      guildOnly: true,
      slash: { root: 'utility', sub: 'snipe', description: 'Show the last deleted message in the channel' },
      async execute(ctx) {
        const cache = ctx.client.snipeCache.get(ctx.channel.id);
        if (!cache) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Snipe', 'Nothing to snipe here.')] });
        const embed = baseEmbed(ctx.guildConfig, '🗑️ Sniped message', cache.content || '*empty / embed only*')
          .setAuthor({ name: cache.authorTag, iconURL: cache.authorAvatar })
          .setFooter({ text: `Deleted ${Math.floor((Date.now() - cache.deletedAt) / 1000)}s ago` });
        await ctx.reply({ embeds: [embed] });
      }
    }),

    makeSimpleCommand({ name: '8ball', aliases: ['eightball'], category: 'Fun', description: 'Random answer', usage: '8ball <question>', dmAllowed: true,
      slash: { root: 'fun', sub: '8ball', description: 'Random answer', options: [{ type: 'string', name: 'question', description: 'Question', required: true }] },
      async execute(ctx) { const q = ctx.interaction ? ctx.interaction.options.getString('question') : ctx.getRest(0); if (!q) return ctx.invalidUsage(); await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎱 8ball', randomOf(['Yes.', 'No.', 'Maybe.', 'Absolutely.', 'Not a chance.', 'Ask later.']))] }); } }),
    makeSimpleCommand({ name: 'coinflip', aliases: ['flip'], category: 'Fun', description: 'Flip a coin', usage: 'coinflip', dmAllowed: true, slash: { root: 'fun', sub: 'coinflip', description: 'Flip a coin' }, async execute(ctx) { await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🪙 Coinflip', randomOf(['Heads', 'Tails']))] }); } }),
    makeSimpleCommand({
      name: 'roll',
      aliases: ['dice'],
      category: 'Fun',
      description: 'Roll a die',
      usage: 'roll [sides]',
      dmAllowed: true,
      slash: { root: 'fun', sub: 'roll', description: 'Roll a die', options: [{ type: 'integer', name: 'sides', description: 'Number of sides', required: false, minValue: 2, maxValue: 1000 }] },
      async execute(ctx) {
        const sides = Number(ctx.getText('sides', 0) || 6);
        const result = Math.floor(Math.random() * sides) + 1;
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎲 Roll', `d${sides} → **${result}**`)] });
      }
    }),
    makeSimpleCommand({
      name: 'rps',
      aliases: ['rockpaperscissors'],
      category: 'Fun',
      description: 'Play rock paper scissors',
      usage: 'rps <rock|paper|scissors>',
      dmAllowed: true,
      slash: { root: 'fun', sub: 'rps', description: 'Play rock paper scissors', options: [{ type: 'string', name: 'choice', description: 'Your choice', required: true, choices: [{ name: 'rock', value: 'rock' }, { name: 'paper', value: 'paper' }, { name: 'scissors', value: 'scissors' }] }] },
      async execute(ctx) {
        const choice = (ctx.getText('choice', 0) || '').toLowerCase();
        if (!['rock', 'paper', 'scissors'].includes(choice)) return ctx.invalidUsage();
        const bot = randomOf(['rock', 'paper', 'scissors']);
        const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
        const result = choice === bot ? 'Draw.' : wins[choice] === bot ? 'You win.' : 'You lose.';
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✂️ RPS', `You: **${choice}**\nBot: **${bot}**\n\n${result}`)] });
      }
    }),
    makeSimpleCommand({ name: 'guess', aliases: [], category: 'Fun', description: 'Guess a number from 1 to 10', usage: 'guess <number>', dmAllowed: true,
      slash: { root: 'fun', sub: 'guess', description: 'Guess a number', options: [{ type: 'integer', name: 'number', description: 'Number', required: true, minValue: 1, maxValue: 10 }] },
      async execute(ctx) { const n = Number(ctx.getText('number', 0)); if (!n) return ctx.invalidUsage(); const bot = Math.floor(Math.random() * 10) + 1; await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔢 Guess', `You chose **${n}**. The number was **${bot}**.\n${n === bot ? 'Nice.' : 'Nope.'}`)] }); } }),
    makeSimpleCommand({ name: 'slots', aliases: ['slot'], category: 'Fun', description: 'Fake slot machine', usage: 'slots', dmAllowed: true, slash: { root: 'fun', sub: 'slots', description: 'Fake slot machine' }, async execute(ctx) { const icons = ['🍒', '🍋', '💎', '7️⃣', '🍇']; const spin = [randomOf(icons), randomOf(icons), randomOf(icons)]; const win = spin.every((i) => i === spin[0]); await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎰 Slots', `${spin.join(' │ ')}\n\n${win ? 'Jackpot.' : 'No luck this time.'}`)] }); } }),
    makeSimpleCommand({ name: 'blackjack', aliases: ['bj'], category: 'Fun', description: 'Simple blackjack', usage: 'blackjack', dmAllowed: true, slash: { root: 'fun', sub: 'blackjack', description: 'Simple blackjack' }, async execute(ctx) { const draw = () => Math.floor(Math.random() * 10) + 1; const you = draw() + draw(); const bot = draw() + draw(); const result = (you > 21 || (bot <= 21 && bot > you)) ? 'You lose.' : you === bot ? 'Draw.' : 'You win.'; await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🃏 Blackjack', `You: **${you}**\nBot: **${bot}**\n\n${result}`)] }); } }),
    makeSimpleCommand({
      name: 'ship',
      aliases: [],
      category: 'Fun',
      description: 'Ship two members',
      usage: 'ship <@a> [@b]',
      guildOnly: true,
      slash: { root: 'fun', sub: 'ship', description: 'Ship two members', options: [{ type: 'user', name: 'target1', description: 'First member', required: true }, { type: 'user', name: 'target2', description: 'Second member', required: false }] },
      async execute(ctx) {
        const first = await ctx.getMember('target1', 0);
        const second = ctx.interaction ? (ctx.interaction.options.getMember('target2') || ctx.member) : (ctx.message?.mentions.members.at(1) || ctx.member);
        if (!first || !second) return ctx.invalidUsage();
        const percent = Math.floor(Math.random() * 101);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💞 Ship', `${first} + ${second} = **${percent}%**`)] });
      }
    }),
    makeSimpleCommand({ name: 'roast', aliases: [], category: 'Fun', description: 'Fake roast', usage: 'roast <@member>', guildOnly: true, slash: { root: 'fun', sub: 'roast', description: 'Fake roast', options: [{ type: 'user', name: 'target', description: 'Target', required: true }] }, async execute(ctx) { const target = await ctx.getMember('target', 0); if (!target) return ctx.invalidUsage(); const roasts = ['has a ping higher than their patience.', 'could miss a pinned message somehow.', 'types like they are always half AFK.']; await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔥 Roast', `${target} ${randomOf(roasts)}`)] }); } }),
    makeSimpleCommand({ name: 'compliment', aliases: ['complimentme'], category: 'Fun', description: 'Random compliment', usage: 'compliment <@member>', guildOnly: true, slash: { root: 'fun', sub: 'compliment', description: 'Random compliment', options: [{ type: 'user', name: 'target', description: 'Target', required: true }] }, async execute(ctx) { const target = await ctx.getMember('target', 0); if (!target) return ctx.invalidUsage(); const compliments = ['brings good energy here.', 'actually makes the server better.', 'has a brain behind the keyboard.']; await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✨ Compliment', `${target} ${randomOf(compliments)}`)] }); } }),
    makeSimpleCommand({ name: 'truth', aliases: [], category: 'Fun', description: 'Truth question', usage: 'truth', dmAllowed: true, slash: { root: 'fun', sub: 'truth', description: 'Truth question' }, async execute(ctx) { await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧠 Truth', randomOf(RANDOM_LINES.truth))] }); } }),
    makeSimpleCommand({ name: 'dare', aliases: [], category: 'Fun', description: 'Dare challenge', usage: 'dare', dmAllowed: true, slash: { root: 'fun', sub: 'dare', description: 'Dare challenge' }, async execute(ctx) { await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⚡ Dare', randomOf(RANDOM_LINES.dare))] }); } }),
    makeSimpleCommand({ name: 'wyr', aliases: ['wouldyourather'], category: 'Fun', description: 'Would you rather', usage: 'wyr', dmAllowed: true, slash: { root: 'fun', sub: 'wyr', description: 'Would you rather' }, async execute(ctx) { await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🤔 Would you rather', randomOf(RANDOM_LINES.wyr))] }); } }),
    makeSimpleCommand({ name: 'hack', aliases: [], category: 'Fun', description: 'Fake hack command', usage: 'hack <@member>', guildOnly: true, slash: { root: 'fun', sub: 'hack', description: 'Fake hack', options: [{ type: 'user', name: 'target', description: 'Target', required: true }] }, async execute(ctx) { const target = await ctx.getMember('target', 0); if (!target) return ctx.invalidUsage(); const percent = Math.floor(Math.random() * 100); await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '💻 Hack', `Scanning ${target} complete.\n\n- Passwords found: **${percent}**\n- Panic level: **${Math.min(100, percent + 12)}%**\n\nThis command is fake.`)] }); } }),
    makeSimpleCommand({ name: 'choose', aliases: ['pick'], category: 'Fun', description: 'Choose one option', usage: 'choose option1 | option2 | option3', dmAllowed: true, slash: { root: 'fun', sub: 'choose', description: 'Choose one option', options: [{ type: 'string', name: 'options', description: 'Options separated with |', required: true }] }, async execute(ctx) { const raw = ctx.interaction ? ctx.interaction.options.getString('options') : ctx.getRest(0); if (!raw) return ctx.invalidUsage(); const options = raw.split('|').map((p) => p.trim()).filter(Boolean); if (options.length < 2) return ctx.invalidUsage('Use at least 2 options separated by `|`.'); await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎯 Choice', `I pick: **${randomOf(options)}**`)] }); } }),
    makeSimpleCommand({ name: 'memeify', aliases: ['meme'], category: 'Fun', description: 'Small meme format', usage: 'memeify <text>', dmAllowed: true, slash: { root: 'fun', sub: 'memeify', description: 'Small meme format', options: [{ type: 'string', name: 'text', description: 'Text', required: true }] }, async execute(ctx) { const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0); if (!text) return ctx.invalidUsage(); await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🖼️ Memeify', `Top text\n\n**${text.toUpperCase()}**\n\nBottom text`)] }); } }),

    ...RANDOM_METERS.map(([name, description, usage, aliases, title, min, max, suffix]) => createMeterCommand(name, description, usage, aliases, title, min, max, suffix)),
    ...TRANSFORMS.map(([name, description, usage, aliases, fn]) => createTransformCommand(name, description, usage, aliases, fn)),


    makeSimpleCommand({
      name: 'createvoc',
      aliases: ['createvoice', 'autovoc', 'tempvoicehub'],
      category: 'Voice',
      description: 'Create or register the join-to-create voice hub channel',
      usage: 'createvoc [#existing-voice] [#category] OR createvoc [hub name]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'voice', sub: 'createvoc', description: 'Create or register the temp voice hub', options: [
        { type: 'channel', name: 'channel', description: 'Existing voice channel to use as the hub', required: false, channelTypes: [ChannelType.GuildVoice, ChannelType.GuildStageVoice] },
        { type: 'string', name: 'name', description: 'Name if DvL should create the hub channel', required: false },
        { type: 'channel', name: 'category', description: 'Optional category for the hub', required: false, channelTypes: [ChannelType.GuildCategory] }
      ] },
      async execute(ctx) {
        let channel = null;
        let category = null;
        let name = '➕ Create Voice';
        if (ctx.interaction) {
          channel = ctx.interaction.options.getChannel('channel');
          category = ctx.interaction.options.getChannel('category');
          name = ctx.interaction.options.getString('name') || name;
        } else {
          channel = await ctx.getChannel('channel', 0);
          if (channel && ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) channel = null;
          category = await ctx.getChannel('category', channel ? 1 : 1);
          if (category && category.type !== ChannelType.GuildCategory) category = null;
          if (!channel) name = ctx.getRest(0) || name;
        }
        if (!channel) {
          channel = await ctx.guild.channels.create({
            name: String(name).slice(0, 100),
            type: ChannelType.GuildVoice,
            parent: category?.id || ctx.channel.parentId || null,
            reason: `Voice hub created by ${ctx.user.tag}`
          }).catch(() => null);
        }
        if (!channel) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice hub', 'I could not create or register the hub voice channel.')] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null } };
          guild.voice.temp = guild.voice.temp || { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null };
          guild.voice.temp.hubChannelId = channel.id;
          guild.voice.temp.hubCategoryId = channel.parentId || category?.id || null;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice hub ready', [
          `Hub channel: ${channel}`,
          'When a member joins this channel, DvL creates their private temp voice automatically.',
          `Use \`${ctx.prefix}voicepanel\` in a text channel to post the management panel.`
        ].join('\n'))] });
      }
    }),

    makeSimpleCommand({
      name: 'move',
      aliases: ['vmove', 'movevoice'],
      category: 'Voice',
      description: 'Move one member to a voice channel',
      usage: 'move <@member> <voice channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MoveMembers],
      slash: { root: 'voice', sub: 'move', description: 'Move one member to a voice channel', options: [
        { type: 'user', name: 'target', description: 'Member to move', required: true },
        { type: 'channel', name: 'channel', description: 'Target voice channel', required: true, channelTypes: [ChannelType.GuildVoice, ChannelType.GuildStageVoice] }
      ] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const channel = await ctx.getChannel('channel', 1);
        if (!target || !channel) return ctx.invalidUsage('Example: `+move @user #General VC`');
        if (!target.voice?.channelId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', `${target} is not in voice.`)] });
        await target.voice.setChannel(channel).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice move', `Moved ${target} to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'pull',
      aliases: ['bringvoice', 'joinme'],
      category: 'Voice',
      description: 'Pull one member into your current voice channel',
      usage: 'pull <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MoveMembers],
      slash: { root: 'voice', sub: 'pull', description: 'Pull a member into your voice channel', options: [
        { type: 'user', name: 'target', description: 'Member to pull', required: true }
      ] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const myChannel = ctx.member?.voice?.channel;
        if (!target) return ctx.invalidUsage();
        if (!myChannel) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', 'You must be in a voice channel first.')] });
        if (!target.voice?.channelId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', `${target} is not in voice.`)] });
        await target.voice.setChannel(myChannel).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice pull', `Pulled ${target} into ${myChannel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'moveall',
      aliases: ['moveeveryone', 'massmove'],
      category: 'Voice',
      description: 'Move everyone from your current voice channel to another one',
      usage: 'moveall <voice channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MoveMembers],
      slash: { root: 'voice', sub: 'moveall', description: 'Move everyone from your voice channel', options: [
        { type: 'channel', name: 'channel', description: 'Target voice channel', required: true, channelTypes: [ChannelType.GuildVoice, ChannelType.GuildStageVoice] }
      ] },
      async execute(ctx) {
        const targetChannel = await ctx.getChannel('channel', 0);
        const sourceChannel = ctx.member?.voice?.channel;
        if (!targetChannel) return ctx.invalidUsage();
        if (!sourceChannel) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', 'Join the source voice channel first, then run this command.')] });
        if (sourceChannel.id === targetChannel.id) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', 'Source and target voice channels are the same.')] });
        const members = [...sourceChannel.members.values()].filter((member) => !member.user.bot);
        let moved = 0;
        for (const member of members) {
          const ok = await member.voice.setChannel(targetChannel).then(() => true).catch(() => false);
          if (ok) moved += 1;
        }
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice move all', `Moved **${moved}** member(s) from ${sourceChannel} to ${targetChannel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'voicekick',
      aliases: ['disconnect', 'vdisconnect', 'vkick'],
      category: 'Voice',
      description: 'Disconnect a member from voice',
      usage: 'voicekick <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MoveMembers],
      slash: { root: 'voice', sub: 'voicekick', description: 'Disconnect a member from voice', options: [
        { type: 'user', name: 'target', description: 'Member to disconnect', required: true }
      ] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        if (!target.voice?.channelId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice', `${target} is not in voice.`)] });
        const voiceChannel = target.voice?.channel;
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '🔊 Voice disconnect',
              title: '🔊 Voice disconnect',
              description: `You were disconnected from voice in **${ctx.guild.name}**.`,
              footerText: 'DvL • voice disconnect'
            })
          : false;
        await target.voice.disconnect('Disconnected by DvL').catch(() => null);
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Channel', value: voiceChannel ? `${voiceChannel}` : 'Unknown', inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '🔊 Voice disconnect', `${target} was disconnected from voice.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🔊 Voice disconnect', `${target} was disconnected from voice.`, target, commonFields, { footerText: 'DvL • voice disconnect' })] });
      }
    }),

    makeSimpleCommand({
      name: 'setvoicemuterole',
      aliases: ['setvmuterole', 'voicemuterole'],
      category: 'Voice',
      description: 'Set or clear the role used for voice mutes',
      usage: 'setvoicemuterole <@role|clear>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'voice', sub: 'setvoicemuterole', description: 'Set the configured voice mute role', options: [{ type: 'role', name: 'role', description: 'Role to assign on voice mute', required: false }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        const raw = String(ctx.getText('role', 0) || ctx.args[0] || '').toLowerCase();
        const clear = !role && ['clear', 'none', 'off', 'remove'].includes(raw);
        if (!role && !clear) return ctx.invalidUsage('Use a role mention or `clear`.');
        if (role && !canBotManageRoleInGuild(ctx.guild, role)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute role', 'I cannot manage that role. Move it below my highest role.')] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null }, moderation: { muteRoleId: null, banRoleId: null } };
          guild.voice.moderation = guild.voice.moderation || { muteRoleId: null, banRoleId: null };
          guild.voice.moderation.muteRoleId = clear ? null : role.id;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute role', clear ? 'Configured voice mute role cleared.' : `Configured voice mute role set to ${role}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setvoicebanrole',
      aliases: ['setvbanrole', 'voicebanrole'],
      category: 'Voice',
      description: 'Set or clear the role used for voice bans',
      usage: 'setvoicebanrole <@role|clear>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'voice', sub: 'setvoicebanrole', description: 'Set the configured voice ban role', options: [{ type: 'role', name: 'role', description: 'Role to assign on voice ban', required: false }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        const raw = String(ctx.getText('role', 0) || ctx.args[0] || '').toLowerCase();
        const clear = !role && ['clear', 'none', 'off', 'remove'].includes(raw);
        if (!role && !clear) return ctx.invalidUsage('Use a role mention or `clear`.');
        if (role && !canBotManageRoleInGuild(ctx.guild, role)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice ban role', 'I cannot manage that role. Move it below my highest role.')] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null }, moderation: { muteRoleId: null, banRoleId: null } };
          guild.voice.moderation = guild.voice.moderation || { muteRoleId: null, banRoleId: null };
          guild.voice.moderation.banRoleId = clear ? null : role.id;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice ban role', clear ? 'Configured voice ban role cleared.' : `Configured voice ban role set to ${role}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'voicepermconfig',
      aliases: ['voiceconfig', 'vconfig'],
      category: 'Voice',
      description: 'Show the current configured voice mute / voice ban roles',
      usage: 'voicepermconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'voice', sub: 'voicepermconfig', description: 'Show voice moderation configuration' },
      async execute(ctx) {
        const voiceConfig = ctx.guildConfig.voice?.moderation || { muteRoleId: null, banRoleId: null };
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice moderation config', [
          `**Voice mute role:** ${voiceConfig.muteRoleId ? `<@&${voiceConfig.muteRoleId}>` : 'not set'}`,
          `**Voice ban role:** ${voiceConfig.banRoleId ? `<@&${voiceConfig.banRoleId}>` : 'not set'}`,
          '',
          `Use \`${ctx.prefix}setvoicemuterole @Role\` and \`${ctx.prefix}setvoicebanrole @Role\`.`,
          'Members with the voice ban role are auto-disconnected if they try to join voice.'
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'voicemute',
      aliases: ['vmute', 'mutevc'],
      category: 'Voice',
      description: 'Assign the configured voice mute role and server mute the member if needed',
      usage: 'voicemute <@member> [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MuteMembers],
      slash: { root: 'voice', sub: 'voicemute', description: 'Voice mute a member using the configured role', options: [
        { type: 'user', name: 'target', description: 'Member to voice mute', required: true },
        { type: 'string', name: 'reason', description: 'Reason', required: false }
      ] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(1).join(' ') || 'No reason.';
        if (!target) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute', 'You cannot moderate that member.')] });
        const roleId = ctx.guildConfig.voice?.moderation?.muteRoleId;
        if (!roleId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute', `No voice mute role is configured yet. Use \`${ctx.prefix}setvoicemuterole @Role\`.`)] });
        const role = await getConfigurableRole(ctx, roleId);
        if (!role) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute', 'The configured voice mute role no longer exists. Set it again.')] });
        if (!canBotManageRoleInGuild(ctx.guild, role)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔇 Voice mute', 'I cannot assign the configured voice mute role. Move it below my highest role.')] });
        await target.roles.add(role, `DvL voice mute • ${reason}`).catch(() => null);
        if (target.voice?.channelId) await target.voice.setMute(true, `DvL voice mute • ${reason}`).catch(() => null);
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '🔇 Voice mute',
              title: '🔇 Voice mute',
              description: `You were voice muted in **${ctx.guild.name}**.`,
              reason,
              footerText: 'DvL • voice mute'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Role', value: `${role}`, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ];
        await sendDetailedModerationLog(ctx, '🔇 Voice mute', `${target} was voice muted.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🔇 Voice mute', `${target} was voice muted.`, target, commonFields, { footerText: 'DvL • voice mute' })] });
      }
    }),
    makeSimpleCommand({
      name: 'voiceunmute',
      aliases: ['vunmute', 'unmutevc'],
      category: 'Voice',
      description: 'Remove the configured voice mute role and unmute the member in voice',
      usage: 'voiceunmute <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MuteMembers],
      slash: { root: 'voice', sub: 'voiceunmute', description: 'Remove a voice mute from a member', options: [{ type: 'user', name: 'target', description: 'Member to unmute', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        const roleId = ctx.guildConfig.voice?.moderation?.muteRoleId;
        if (!roleId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔊 Voice unmute', `No voice mute role is configured yet. Use \`${ctx.prefix}setvoicemuterole @Role\`.`)] });
        const role = await getConfigurableRole(ctx, roleId);
        if (role && target.roles.cache.has(role.id)) await target.roles.remove(role, 'DvL voice unmute').catch(() => null);
        if (target.voice?.channelId) await target.voice.setMute(false, 'DvL voice unmute').catch(() => null);
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '🔊 Voice unmute',
              title: '🔊 Voice unmute',
              description: `Your voice mute was removed in **${ctx.guild.name}**.`,
              footerText: 'DvL • voice unmute'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '🔊 Voice unmute', `${target} is no longer voice muted.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🔊 Voice unmute', `${target} is no longer voice muted.`, target, commonFields, { footerText: 'DvL • voice unmute' })] });
      }
    }),
    makeSimpleCommand({
      name: 'voiceban',
      aliases: ['vban', 'banvc'],
      category: 'Voice',
      description: 'Assign the configured voice ban role and disconnect the member from voice',
      usage: 'voiceban <@member> [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageRoles],
      slash: { root: 'voice', sub: 'voiceban', description: 'Voice ban a member using the configured role', options: [
        { type: 'user', name: 'target', description: 'Member to voice ban', required: true },
        { type: 'string', name: 'reason', description: 'Reason', required: false }
      ] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(1).join(' ') || 'No reason.';
        if (!target) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Voice ban', 'You cannot moderate that member.')] });
        const roleId = ctx.guildConfig.voice?.moderation?.banRoleId;
        if (!roleId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Voice ban', `No voice ban role is configured yet. Use \`${ctx.prefix}setvoicebanrole @Role\`.`)] });
        const role = await getConfigurableRole(ctx, roleId);
        if (!role) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Voice ban', 'The configured voice ban role no longer exists. Set it again.')] });
        if (!canBotManageRoleInGuild(ctx.guild, role)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⛔ Voice ban', 'I cannot assign the configured voice ban role. Move it below my highest role.')] });
        await target.roles.add(role, `DvL voice ban • ${reason}`).catch(() => null);
        if (target.voice?.channelId) await target.voice.disconnect(`DvL voice ban • ${reason}`).catch(() => null);
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '⛔ Voice ban',
              title: '⛔ Voice ban',
              description: `You can no longer join voice in **${ctx.guild.name}**.`,
              reason,
              footerText: 'DvL • voice ban'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Role', value: `${role}`, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ];
        await sendDetailedModerationLog(ctx, '⛔ Voice ban', `${target} received the configured voice ban role.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '⛔ Voice ban', `${target} can no longer join voice.`, target, commonFields, { footerText: 'DvL • voice ban' })] });
      }
    }),
    makeSimpleCommand({
      name: 'voiceunban',
      aliases: ['vunban', 'unbanvc'],
      category: 'Voice',
      description: 'Remove the configured voice ban role',
      usage: 'voiceunban <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'voice', sub: 'voiceunban', description: 'Remove a voice ban role from a member', options: [{ type: 'user', name: 'target', description: 'Member to unban from voice', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        const roleId = ctx.guildConfig.voice?.moderation?.banRoleId;
        if (!roleId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✅ Voice unban', `No voice ban role is configured yet. Use \`${ctx.prefix}setvoicebanrole @Role\`.`)] });
        const role = await getConfigurableRole(ctx, roleId);
        if (role && target.roles.cache.has(role.id)) await target.roles.remove(role, 'DvL voice unban').catch(() => null);
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '✅ Voice unban',
              title: '✅ Voice unban',
              description: `You can join voice again in **${ctx.guild.name}**.`,
              footerText: 'DvL • voice unban'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '✅ Voice unban', `${target} can join voice again.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '✅ Voice unban', `${target} can join voice again.`, target, commonFields, { footerText: 'DvL • voice unban' })] });
      }
    }),
    makeSimpleCommand({
      name: 'stats',
      aliases: ['serverstatsview', 'statshub'],
      category: 'Tracking',
      description: 'Clean hub for live member / online / voice counters',
      usage: 'stats [view|setup [category]|refresh|repair|off|channel <members|online|voice> <here|#voice|id>|label <members|online|voice> [here|#voice|id] <label>]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();
        const stats = ctx.guildConfig.stats || { enabled: false, categoryId: null, channels: {}, labels: {} };

        if (['view', 'config', 'show', 'list', 'status'].includes(action)) {
          const live = getLiveGuildStats(ctx.guild);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats config', [
            `**Status:** ${stats.enabled ? 'on' : 'off'}`,
            `**Category:** ${stats.categoryId ? `<#${stats.categoryId}>` : 'not set'}`,
            `**Members channel:** ${stats.channels?.members ? `<#${stats.channels.members}>` : 'not set'}`,
            `**Online channel:** ${stats.channels?.online ? `<#${stats.channels.online}>` : 'not set'}`,
            `**Voice channel:** ${stats.channels?.voice ? `<#${stats.channels.voice}>` : 'not set'}`,
            '',
            `**Live members:** ${formatStatNumber(live.members)}`,
            `**Live online:** ${formatStatNumber(live.online)}`,
            `**Live voice:** ${formatStatNumber(live.voice)}`,
            '',
            `**Auto refresh:** every minute`,
            `**Auto repair:** missing counters are recreated when the stats category exists`,
            '',
            `**Members label:** ${stats.labels?.members || 'not set'}`,
            `**Online label:** ${stats.labels?.online || 'not set'}`,
            `**Voice label:** ${stats.labels?.voice || 'not set'}`,
            '',
            `Quick use: \`${ctx.prefix}stats setup\` • \`${ctx.prefix}stats channel members here\` • \`${ctx.prefix}stats label voice 🔊・Vocal : {count}\``
          ].join('\n'))] });
        }

        if (action === 'refresh') {
          await ctx.client.ensureGuildStatsChannels?.(ctx.guild, { recreateMissing: true });
          const result = await refreshConfiguredStatsChannels(ctx.guild, ctx.store.getGuild(ctx.guild.id));
          if (!result) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats refresh', `Stats are not enabled yet. Use \`${ctx.prefix}stats setup\` or \`${ctx.prefix}statssetup\`.`)] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats refreshed', [
            `Members: **${formatStatNumber(result.live.members)}**`,
            `Online: **${formatStatNumber(result.live.online)}**`,
            `Voice: **${formatStatNumber(result.live.voice)}**`,
            '',
            `Stats already refresh automatically every minute. This command is only a manual force refresh.`
          ].join('\n'))] });
        }

        if (action === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
            guild.stats.enabled = false;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats disabled', 'Automatic live stats updates are now off. Existing channels were kept.')] });
        }

        if (action === 'setup') {
          const guild = ctx.guild;
          const live = getLiveGuildStats(guild);
          const rawCategoryArg = ctx.args.slice(1).join(' ').trim();
          const pickedChannel = await ctx.getChannel('channel', 1);
          const candidateCategory = pickedChannel?.type === ChannelType.GuildCategory
            ? pickedChannel
            : (String(ctx.args[1] || '').toLowerCase() === 'here' && ctx.channel?.parent?.type === ChannelType.GuildCategory ? ctx.channel.parent : null);
          const categoryName = (!candidateCategory && rawCategoryArg) ? rawCategoryArg : '📊 Statistiques';
          const existingCategoryId = stats.categoryId;
          let category = candidateCategory || (existingCategoryId ? (guild.channels.cache.get(existingCategoryId) || await guild.channels.fetch(existingCategoryId).catch(() => null)) : null);
          if (!category || category.type !== ChannelType.GuildCategory) {
            category = await guild.channels.create({
              name: String(categoryName).slice(0, 100),
              type: ChannelType.GuildCategory,
              reason: `Stats setup by ${ctx.user.tag}`
            }).catch(() => null);
          }
          if (!category) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats setup', 'I could not create the stats category.')] });
          const labels = {
            members: stats.labels?.members || '👥・Membres : {count}',
            online: stats.labels?.online || '🌐・En ligne : {count}',
            voice: stats.labels?.voice || '🔊・Vocal : {count}'
          };
          const existingChannels = stats.channels || {};
          let membersChannel = existingChannels.members ? (guild.channels.cache.get(existingChannels.members) || await guild.channels.fetch(existingChannels.members).catch(() => null)) : null;
          let onlineChannel = existingChannels.online ? (guild.channels.cache.get(existingChannels.online) || await guild.channels.fetch(existingChannels.online).catch(() => null)) : null;
          let voiceChannel = existingChannels.voice ? (guild.channels.cache.get(existingChannels.voice) || await guild.channels.fetch(existingChannels.voice).catch(() => null)) : null;
          if (!membersChannel) membersChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.members, live.members), category.id);
          if (!onlineChannel) onlineChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.online, live.online), category.id);
          if (!voiceChannel) voiceChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.voice, live.voice), category.id);
          for (const channel of [membersChannel, onlineChannel, voiceChannel].filter(Boolean)) {
            if (channel.parentId !== category.id) await channel.setParent(category.id).catch(() => null);
          }
          ctx.store.updateGuild(ctx.guild.id, (guildConfig) => {
            guildConfig.stats = guildConfig.stats || { enabled: false, categoryId: null, channels: {}, labels, lockChannels: true };
            guildConfig.stats.enabled = true;
            guildConfig.stats.categoryId = category.id;
            guildConfig.stats.channels = {
              members: membersChannel?.id || null,
              online: onlineChannel?.id || null,
              voice: voiceChannel?.id || null
            };
            guildConfig.stats.labels = { ...(guildConfig.stats.labels || {}), ...labels };
            guildConfig.stats.lockChannels = true;
            return guildConfig;
          });
          if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats ready', [
            `Category: ${category}`,
            `Members: ${membersChannel || 'not created'}`,
            `Online: ${onlineChannel || 'not created'}`,
            `Voice: ${voiceChannel || 'not created'}`
          ].join('\n'))] });
        }

        if (action === 'channel') {
          const type = normalizeStatsTypeInput(ctx.args[1]);
          if (!type) return ctx.invalidUsage(`Types: \`members\`, \`online\`, \`voice\`.`);
          const rawDestination = String(ctx.args[2] || '').toLowerCase();
          let targetChannel = null;
          if (rawDestination === 'here' && [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(ctx.channel?.type)) targetChannel = ctx.channel;
          if (!targetChannel) targetChannel = await ctx.getChannel('channel', 2);
          if (!targetChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(targetChannel.type)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}stats channel ${type} 123456789012345678\`, \`${ctx.prefix}stats channel ${type} #vocal-counter\`, or run it directly inside the voice channel with \`${ctx.prefix}stats channel ${type} here\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
            guild.stats.enabled = true;
            guild.stats.channels = guild.stats.channels || {};
            guild.stats.labels = guild.stats.labels || {};
            guild.stats.channels[type] = targetChannel.id;
            if (!guild.stats.categoryId && targetChannel.parentId) guild.stats.categoryId = targetChannel.parentId;
            guild.stats.lockChannels = true;
            if (!guild.stats.labels[type]) guild.stats.labels[type] = type === 'members' ? '👥・Membres : {count}' : type === 'online' ? '🌐・En ligne : {count}' : '🔊・Vocal : {count}';
            return guild;
          });
          if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats channel updated', `**${type}** counter bound to ${targetChannel}.`)] });
        }

        if (action === 'label') {
          const type = normalizeStatsTypeInput(ctx.args[1]);
          if (!type) return ctx.invalidUsage(`Types: \`members\`, \`online\`, \`voice\`.`);
          const rawThird = String(ctx.args[2] || '').toLowerCase();
          let boundChannel = null;
          if (rawThird === 'here' && [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(ctx.channel?.type)) boundChannel = ctx.channel;
          if (!boundChannel) boundChannel = await ctx.getChannel('channel', 2);
          const labelStartIndex = boundChannel || rawThird === 'here' ? 3 : 2;
          const label = ctx.args.slice(labelStartIndex).join(' ').trim();
          if (!label) return ctx.invalidUsage(`Example: \`${ctx.prefix}stats label ${type} 👥・Membres : {count}\``);
          if (boundChannel && ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(boundChannel.type)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats label', 'The linked stats channel must be a **voice channel**.')] });
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
            guild.stats.enabled = true;
            guild.stats.labels = guild.stats.labels || {};
            guild.stats.channels = guild.stats.channels || {};
            guild.stats.labels[type] = String(label).slice(0, 100);
            if (boundChannel) guild.stats.channels[type] = boundChannel.id;
            return guild;
          });
          if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats label updated', [
            `**Type:** ${type}`,
            boundChannel ? `**Counter channel:** ${boundChannel}` : null,
            `**Label:** ${label}`
          ].filter(Boolean).join('\n'))] });
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}stats view\`, \`${ctx.prefix}stats setup\`, \`${ctx.prefix}stats repair\`, \`${ctx.prefix}stats channel members here\`, \`${ctx.prefix}stats label voice 🔊・Vocal : {count}\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'statschannel',
      aliases: ['setstatschannel', 'bindstatschannel'],
      category: 'Tracking',
      description: 'Bind one voice counter channel quickly',
      usage: 'statschannel <members|online|voice> <here|#voice|id>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      async execute(ctx) {
        const type = normalizeStatsTypeInput(ctx.args[0]);
        if (!type) return ctx.invalidUsage(`Types: \`members\`, \`online\`, \`voice\`.`);
        const rawDestination = String(ctx.args[1] || '').toLowerCase();
        let targetChannel = null;
        if (rawDestination === 'here' && [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(ctx.channel?.type)) targetChannel = ctx.channel;
        if (!targetChannel) targetChannel = await ctx.getChannel('channel', 1);
        if (!targetChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(targetChannel.type)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}statschannel ${type} here\`, \`${ctx.prefix}statschannel ${type} #voice-counter\`, \`${ctx.prefix}statschannel ${type} 123456789012345678\`.`);
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          guild.stats.enabled = true;
          guild.stats.channels = guild.stats.channels || {};
          guild.stats.labels = guild.stats.labels || {};
          guild.stats.channels[type] = targetChannel.id;
          if (!guild.stats.categoryId && targetChannel.parentId) guild.stats.categoryId = targetChannel.parentId;
            guild.stats.lockChannels = true;
            if (!guild.stats.labels[type]) guild.stats.labels[type] = type === 'members' ? '👥・Membres : {count}' : type === 'online' ? '🌐・En ligne : {count}' : '🔊・Vocal : {count}';
          return guild;
        });
        if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats channel updated', `**${type}** counter bound to ${targetChannel}.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'statssetup',
      aliases: ['serverstats', 'statspanel', 'statsetup'],
      category: 'Tracking',
      description: 'Create the locked live stats channels like members / online / voice',
      usage: 'statssetup [category name]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'statssetup', description: 'Create the live stats channels', options: [{ type: 'string', name: 'category', description: 'Optional category name', required: false }] },
      async execute(ctx) {
        const guild = ctx.guild;
        const live = getLiveGuildStats(guild);
        const rawCategoryArg = (ctx.interaction ? ctx.interaction.options.getString('category') : ctx.getRest(0)) || '';
        const pickedChannel = await ctx.getChannel('channel', 0);
        const candidateCategory = pickedChannel?.type === ChannelType.GuildCategory
          ? pickedChannel
          : (String(ctx.args[0] || '').toLowerCase() === 'here' && ctx.channel?.parent?.type === ChannelType.GuildCategory ? ctx.channel.parent : null);
        const categoryName = (!candidateCategory && rawCategoryArg) ? rawCategoryArg : '📊 Statistiques';
        const existingCategoryId = ctx.guildConfig.stats?.categoryId;
        let category = candidateCategory || (existingCategoryId ? (guild.channels.cache.get(existingCategoryId) || await guild.channels.fetch(existingCategoryId).catch(() => null)) : null);
        if (!category || category.type !== ChannelType.GuildCategory) {
          category = await guild.channels.create({
            name: String(categoryName).slice(0, 100),
            type: ChannelType.GuildCategory,
            reason: `Stats setup by ${ctx.user.tag}`
          }).catch(() => null);
        }
        if (!category) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats setup', 'I could not create the stats category.')] });
        const labels = {
          members: ctx.guildConfig.stats?.labels?.members || '👥・Membres : {count}',
          online: ctx.guildConfig.stats?.labels?.online || '🌐・En ligne : {count}',
          voice: ctx.guildConfig.stats?.labels?.voice || '🔊・Vocal : {count}'
        };
        const existingChannels = ctx.guildConfig.stats?.channels || {};
        let membersChannel = existingChannels.members ? (guild.channels.cache.get(existingChannels.members) || await guild.channels.fetch(existingChannels.members).catch(() => null)) : null;
        let onlineChannel = existingChannels.online ? (guild.channels.cache.get(existingChannels.online) || await guild.channels.fetch(existingChannels.online).catch(() => null)) : null;
        let voiceChannel = existingChannels.voice ? (guild.channels.cache.get(existingChannels.voice) || await guild.channels.fetch(existingChannels.voice).catch(() => null)) : null;
        if (!membersChannel) membersChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.members, live.members), category.id);
        if (!onlineChannel) onlineChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.online, live.online), category.id);
        if (!voiceChannel) voiceChannel = await ensureStatsVoiceChannel(guild, buildStatsChannelName(labels.voice, live.voice), category.id);
        for (const channel of [membersChannel, onlineChannel, voiceChannel].filter(Boolean)) {
          if (channel.parentId !== category.id) await channel.setParent(category.id).catch(() => null);
        }
        ctx.store.updateGuild(ctx.guild.id, (guildConfig) => {
          guildConfig.stats = guildConfig.stats || { enabled: false, categoryId: null, channels: {}, labels, lockChannels: true };
          guildConfig.stats.enabled = true;
          guildConfig.stats.categoryId = category.id;
          guildConfig.stats.channels = {
            members: membersChannel?.id || null,
            online: onlineChannel?.id || null,
            voice: voiceChannel?.id || null
          };
          guildConfig.stats.labels = { ...(guildConfig.stats.labels || {}), ...labels };
          guildConfig.stats.lockChannels = true;
          return guildConfig;
        });
        if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats ready', [
          `Category: ${category}`,
          `Members: ${membersChannel || 'not created'}`,
          `Online: ${onlineChannel || 'not created'}`,
          `Voice: ${voiceChannel || 'not created'}`,
          '',
          `Use \`${ctx.prefix}setstatslabel members 👥 • Membres : {count}\` to restyle a line.`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'setstatslabel',
      aliases: ['statslabel', 'setstatlabel'],
      category: 'Tracking',
      description: 'Customize one live stats label and optionally bind an existing voice channel as the counter channel',
      usage: 'setstatslabel <members|member|membre|online|voice|vocal> [#voice-channel|channel-id] <label with {count}>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'setstatslabel', description: 'Customize one stats channel label', options: [
        { type: 'string', name: 'type', description: 'Stats line', required: true, choices: STATS_TYPE_CHOICES },
        { type: 'channel', name: 'channel', description: 'Optional existing voice channel to turn into the counter', required: false },
        { type: 'string', name: 'label', description: 'Example: 👥・Membres : {count}', required: true }
      ] },
      async execute(ctx) {
        const type = normalizeStatsTypeInput(ctx.getText('type', 0));
        if (!type) return ctx.invalidUsage('Types: `members`, `member`, `membre`, `online`, `voice`, `vocal`.');

        let boundChannel = null;
        let label = null;
        if (ctx.interaction) {
          boundChannel = await ctx.getChannel('channel', 1);
          label = ctx.interaction.options.getString('label');
        } else {
          const rawChannelArg = String(ctx.args[1] || '').toLowerCase();
          if (rawChannelArg === 'here' && [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(ctx.channel?.type)) boundChannel = ctx.channel;
          else boundChannel = await ctx.getChannel('channel', 1);
          const labelStartIndex = boundChannel || rawChannelArg === 'here' ? 2 : 1;
          label = ctx.args.slice(labelStartIndex).join(' ').trim();
          if (!label && (boundChannel || rawChannelArg === 'here')) label = String(ctx.guildConfig.stats?.labels?.[type] || '').trim();
        }

        if (!label) return ctx.invalidUsage('Give a label like `👥・Membres : {count}`.');
        if (boundChannel && boundChannel.type !== ChannelType.GuildVoice) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats label', 'The linked stats channel must be a **voice channel**.')] });
        }

        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          guild.stats.enabled = true;
          guild.stats.labels = guild.stats.labels || {};
          guild.stats.channels = guild.stats.channels || {};
          guild.stats.labels[type] = String(label).slice(0, 100);
          if (boundChannel) guild.stats.channels[type] = boundChannel.id;
          return guild;
        });
        if (ctx.client.refreshGuildStats) await ctx.client.refreshGuildStats(ctx.guild);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats label updated', [
          `**Type:** ${type}`,
          boundChannel ? `**Counter channel:** ${boundChannel}` : null,
          `**Label:** ${label}`,
          '',
          'Tip: you can use an existing voice channel ID to turn it into a live counter.'
        ].filter(Boolean).join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'statsrepair',
      aliases: ['repairstats', 'fixstats'],
      category: 'Tracking',
      description: 'Recreate missing stats counters and refresh their names',
      usage: 'statsrepair',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'statsrepair', description: 'Repair missing stats counters' },
      async execute(ctx) {
        const ensured = await ctx.client.ensureGuildStatsChannels?.(ctx.guild, { recreateMissing: true });
        const result = await refreshConfiguredStatsChannels(ctx.guild, ctx.store.getGuild(ctx.guild.id));
        if (!ensured || !result) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧰 Stats repair', `Stats are not enabled yet. Use \`${ctx.prefix}statssetup\`.`)] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧰 Stats repair', [
          `Category: ${ensured.category ? `<#${ensured.category.id}>` : 'not set'}`,
          `Members: ${ensured.channels?.members ? `<#${ensured.channels.members.id}>` : 'missing'}`,
          `Online: ${ensured.channels?.online ? `<#${ensured.channels.online.id}>` : 'missing'}`,
          `Voice: ${ensured.channels?.voice ? `<#${ensured.channels.voice.id}>` : 'missing'}`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'statsrefresh',
      aliases: ['refreshstats', 'updatestats'],
      category: 'Tracking',
      description: 'Force-refresh the live stats channel names',
      usage: 'statsrefresh',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'statsrefresh', description: 'Refresh the live stats channels now' },
      async execute(ctx) {
        const result = await refreshConfiguredStatsChannels(ctx.guild, ctx.store.getGuild(ctx.guild.id));
        if (!result) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats refresh', `Stats are not enabled yet. Use \`${ctx.prefix}statssetup\`.`)] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats refreshed', [
          `Members: **${formatStatNumber(result.live.members)}**`,
          `Online: **${formatStatNumber(result.live.online)}**`,
          `Voice: **${formatStatNumber(result.live.voice)}**`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'statsconfig',
      aliases: ['serverstatsconfig', 'statconfig'],
      category: 'Tracking',
      description: 'Show the current live stats configuration',
      usage: 'statsconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'statsconfig', description: 'Show the live stats configuration' },
      async execute(ctx) {
        const stats = ctx.guildConfig.stats || { enabled: false, categoryId: null, channels: {}, labels: {} };
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats config', [
          `**Status:** ${stats.enabled ? 'on' : 'off'}`,
          `**Category:** ${stats.categoryId ? `<#${stats.categoryId}>` : 'not set'}`,
          `**Members channel:** ${stats.channels?.members ? `<#${stats.channels.members}>` : 'not set'}`,
          `**Online channel:** ${stats.channels?.online ? `<#${stats.channels.online}>` : 'not set'}`,
          `**Voice channel:** ${stats.channels?.voice ? `<#${stats.channels.voice}>` : 'not set'}`,
          '',
          `**Members label:** ${stats.labels?.members || 'not set'}`,
          `**Online label:** ${stats.labels?.online || 'not set'}`,
          `**Voice label:** ${stats.labels?.voice || 'not set'}`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'statsoff',
      aliases: ['statsdisable', 'disablestats'],
      category: 'Tracking',
      description: 'Disable automatic live stats updates without deleting the channels',
      usage: 'statsoff',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'tracking', sub: 'statsoff', description: 'Disable automatic stats updates' },
      async execute(ctx) {
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          guild.stats.enabled = false;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📊 Stats disabled', 'Automatic live stats updates are now off. Existing channels were kept.')] });
      }
    }),
    makeSimpleCommand({
      name: 'voicepanel',
      aliases: ['createvoicepanel', 'vpanel', 'temppanel'],
      category: 'Voice',
      description: 'Post the temp voice control panel with create / crown / lock / rename buttons',
      usage: 'voicepanel',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'voice', sub: 'voicepanel', description: 'Post the temp voice control panel' },
      async execute(ctx) {
        const sent = await ctx.reply({ embeds: [createVoicePanelEmbed(ctx.guildConfig)], components: createVoicePanelComponents() });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.voice = guild.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null } };
          guild.voice.temp = guild.voice.temp || { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null };
          guild.voice.temp.panelChannelId = sent.channel.id;
          guild.voice.temp.panelMessageId = sent.id;
          return guild;
        });
      }
    }),
    makeSimpleCommand({
      name: 'clear',
      aliases: ['purge', 'prune'],
      category: 'Moderation',
      description: 'Delete messages in bulk',
      usage: 'clear <amount>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'mod', sub: 'clear', description: 'Delete messages in bulk', options: [{ type: 'integer', name: 'amount', description: '1-100', required: true, minValue: 1, maxValue: 100 }] },
      async execute(ctx) {
        const amount = Number(ctx.getText('amount', 0));
        if (!amount) return ctx.invalidUsage();
        const deleted = await ctx.channel.bulkDelete(amount, true).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧹 Clear', `Deleted **${deleted?.size || 0}** message(s).`)] });
      }
    }),
    makeSimpleCommand({
      name: 'slowmode',
      aliases: ['slow'],
      category: 'Moderation',
      description: 'Set channel slowmode',
      usage: 'slowmode <seconds>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'mod', sub: 'slowmode', description: 'Set channel slowmode', options: [{ type: 'integer', name: 'seconds', description: 'Seconds', required: true, minValue: 0, maxValue: 21600 }] },
      async execute(ctx) {
        const seconds = Number(ctx.getText('seconds', 0));
        if (Number.isNaN(seconds)) return ctx.invalidUsage();
        await ctx.channel.setRateLimitPerUser(seconds).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🐢 Slowmode', `Slowmode set to **${seconds}s**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'lock',
      aliases: [],
      category: 'Moderation',
      description: 'Lock the current channel',
      usage: 'lock',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'mod', sub: 'lock', description: 'Lock the current channel' },
      async execute(ctx) {
        await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false }).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔒 Channel locked', `${ctx.channel} is now locked.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'unlock',
      aliases: [],
      category: 'Moderation',
      description: 'Unlock the current channel',
      usage: 'unlock',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'mod', sub: 'unlock', description: 'Unlock the current channel' },
      async execute(ctx) {
        await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null }).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔓 Channel unlocked', `${ctx.channel} is now unlocked.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'renew',
      aliases: ['nukechannel', 'clonechannel'],
      category: 'Moderation',
      description: 'Clone the current channel and delete the old one for a clean reset',
      usage: 'renew [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'mod', sub: 'renew', description: 'Clone the current channel and delete the old one', options: [{ type: 'string', name: 'reason', description: 'Optional reason', required: false }] },
      async execute(ctx) {
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'Channel renewed by DvL.') : (ctx.getRest(0) || 'Channel renewed by DvL.');
        if (!ctx.channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(ctx.channel.type)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '♻️ Renew', 'This command only works in a text or announcement channel.')] });
        }
        const source = ctx.channel;
        const clone = await source.clone({ reason }).catch(() => null);
        if (!clone) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '♻️ Renew', 'I could not clone this channel.')] });
        await clone.setPosition(source.position).catch(() => null);
        await clone.send({ embeds: [baseEmbed(ctx.guildConfig, '♻️ Channel renewed', `Channel renewed by ${ctx.user}.\nReason: **${reason}**`)] }).catch(() => null);
        await source.delete(reason).catch(() => null);
      }
    }),
    makeSimpleCommand({
      name: 'warn',
      aliases: [],
      category: 'Moderation',
      description: 'Warn a member',
      usage: 'warn <@member> <reason>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'mod', sub: 'warn', description: 'Warn a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }, { type: 'string', name: 'reason', description: 'Reason', required: false }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(1).join(' ') || 'No reason.';
        if (!target) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⚠️ Warn', 'You cannot moderate that member.')] });
        let warningCount = 0;
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.moderation.warnings[target.id] = guild.moderation.warnings[target.id] || [];
          guild.moderation.warnings[target.id].push({ by: ctx.user.id, reason, at: Date.now() });
          warningCount = guild.moderation.warnings[target.id].length;
          return guild;
        });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '⚠️ Warning',
              title: '⚠️ Warning',
              description: `You received a warning in **${ctx.guild.name}**.`,
              reason,
              footerText: 'DvL • warning'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'Warnings now', value: String(warningCount), inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ];
        await sendDetailedModerationLog(ctx, '⚠️ Member warned', `${target} received a warning.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '⚠️ Warning sent', `${target} received a warning.`, target, commonFields, { footerText: 'DvL • warning sent' })] });
      }
    }),
    makeSimpleCommand({
      name: 'warnings',
      aliases: ['warns'],
      category: 'Moderation',
      description: 'List warnings for a member',
      usage: 'warnings <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'mod', sub: 'warnings', description: 'List warnings for a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        const list = ctx.guildConfig.moderation.warnings[target.id] || [];
        const latest = list[list.length - 1] || null;
        const recentLines = list.length
          ? list.slice(-18).reverse().map((warn, index) => `**#${list.length - index}** • <@${warn.by}> • <t:${Math.floor(warn.at / 1000)}:R>
${clipText(warn.reason, 220)}`)
          : [];
        const embeds = [buildMemberActionEmbed(
          ctx.guildConfig,
          '📒 Warning history',
          `${target} warning overview.`,
          target,
          [
            { name: 'Member', value: `${target}`, inline: true },
            { name: 'User ID', value: `\`${target.id}\``, inline: true },
            { name: 'Total warnings', value: String(list.length), inline: true },
            { name: 'Latest reason', value: latest ? clipText(latest.reason, 180) : 'None', inline: false }
          ],
          { footerText: 'DvL • warning history' }
        )];
        if (recentLines.length) {
          const chunks = chunkLines(recentLines, 4);
          chunks.forEach((chunk, index) => {
            const embed = index === 0 ? embeds[0] : buildMemberActionEmbed(ctx.guildConfig, '📒 Warning history', 'Continuation', target, [], { footerText: 'DvL • warning history' });
            embed.addFields({ name: chunks.length > 1 ? `Recent warnings • page ${index + 1}/${chunks.length}` : 'Recent warnings', value: chunk.join('\n\n').slice(0, 1024), inline: false });
            if (index !== 0) embeds.push(embed);
          });
        } else {
          embeds[0].addFields({ name: 'Recent warnings', value: 'No warnings.', inline: false });
        }
        await ctx.reply({ embeds });
      }
    }),
    makeSimpleCommand({
      name: 'clearwarnings',
      aliases: ['resetwarns', 'clearwarns'],
      category: 'Moderation',
      description: 'Clear warnings for a member',
      usage: 'clearwarnings <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'mod', sub: 'clearwarnings', description: 'Clear warnings for a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        const clearedCount = (ctx.guildConfig.moderation.warnings[target.id] || []).length;
        ctx.store.updateGuild(ctx.guild.id, (guild) => { delete guild.moderation.warnings[target.id]; return guild; });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '🧽 Warnings cleared',
              title: '🧽 Warnings cleared',
              description: `Your warning history was cleared in **${ctx.guild.name}**.`,
              footerText: 'DvL • warnings cleared'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'Cleared entries', value: String(clearedCount), inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '🧽 Warnings cleared', `${target} had their warning history cleared.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🧽 Warnings cleared', `${target}'s warning history was cleared.`, target, commonFields, { footerText: 'DvL • warnings cleared' })] });
      }
    }),
    makeSimpleCommand({
      name: 'timeout',
      aliases: ['mute', 'tempmute'],
      category: 'Moderation',
      description: 'Timeout a member',
      usage: 'timeout <@member> <time> [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'mod', sub: 'timeout', description: 'Timeout a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }, { type: 'string', name: 'time', description: 'Example: 10m', required: true }, { type: 'string', name: 'reason', description: 'Reason', required: false }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const timeRaw = ctx.getText('time', 1);
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(2).join(' ') || 'No reason.';
        const duration = parseDuration(timeRaw);
        if (!target || !duration) return ctx.invalidUsage('Example: `+timeout @user 10m spam`');
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏳ Timeout', 'You cannot moderate that member.')] });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '⏳ Timeout',
              title: '⏳ Timeout',
              description: `You were timed out in **${ctx.guild.name}**.`,
              reason,
              duration: formatDuration(duration),
              footerText: 'DvL • timeout'
            })
          : false;
        const ok = await target.timeout(duration, reason).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏳ Timeout', 'I could not apply the timeout. Check my permissions and role position.')] });
        const untilTs = Math.floor((Date.now() + duration) / 1000);
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'Duration', value: formatDuration(duration), inline: true },
          { name: 'Until', value: `<t:${untilTs}:f>`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ];
        await sendDetailedModerationLog(ctx, '⏳ Member timed out', `${target} was timed out.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '⏳ Timeout applied', `${target} was timed out.`, target, commonFields, { footerText: 'DvL • timeout applied' })] });
      }
    }),
    makeSimpleCommand({
      name: 'untimeout',
      aliases: ['unmute'],
      category: 'Moderation',
      description: 'Remove a timeout',
      usage: 'untimeout <@member>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      slash: { root: 'mod', sub: 'untimeout', description: 'Remove a timeout', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✅ Timeout removed', 'You cannot moderate that member.')] });
        const ok = await target.timeout(null).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✅ Timeout removed', 'I could not remove the timeout. Check my permissions and role position.')] });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '✅ Timeout removed',
              title: '✅ Timeout removed',
              description: `Your timeout was removed in **${ctx.guild.name}**.`,
              footerText: 'DvL • timeout removed'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '✅ Timeout removed', `${target} is no longer timed out.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '✅ Timeout removed', `${target} is no longer timed out.`, target, commonFields, { footerText: 'DvL • timeout removed' })] });
      }
    }),
    makeSimpleCommand({
      name: 'kick',
      aliases: [],
      category: 'Moderation',
      description: 'Kick a member',
      usage: 'kick <@member> [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.KickMembers],
      slash: { root: 'mod', sub: 'kick', description: 'Kick a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }, { type: 'string', name: 'reason', description: 'Reason', required: false }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(1).join(' ') || 'No reason.';
        if (!target) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👢 Kick', 'You cannot moderate that member.')] });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '👢 Kick',
              title: '👢 Kick',
              description: `You were kicked from **${ctx.guild.name}**.`,
              reason,
              footerText: 'DvL • kick'
            })
          : false;
        const commonFields = [
          { name: 'User', value: `${target.user.tag}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ];
        const ok = await target.kick(reason).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👢 Kick', 'I could not kick that member. Check my permissions and role position.')] });
        await sendDetailedModerationLog(ctx, '👢 Member kicked', `${target.user.tag} was kicked.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '👢 Member kicked', `${target.user.tag} was kicked.`, target, commonFields, { footerText: 'DvL • member kicked' })] });
      }
    }),
    makeSimpleCommand({
      name: 'ban',
      aliases: ['tempban'],
      category: 'Moderation',
      description: 'Ban a member',
      usage: 'ban <@member> [time] [reason]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.BanMembers],
      slash: { root: 'mod', sub: 'ban', description: 'Ban a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }, { type: 'string', name: 'reason', description: 'Reason', required: false }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        if (!target) return ctx.invalidUsage();
        const maybeTime = ctx.interaction ? null : ctx.args[1];
        const duration = maybeTime ? parseDuration(maybeTime) : null;
        const reason = ctx.interaction ? (ctx.interaction.options.getString('reason') || 'No reason.') : ctx.args.slice(duration ? 2 : 1).join(' ') || 'No reason.';
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔨 Ban', 'You cannot moderate that member.')] });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '🔨 Ban',
              title: '🔨 Ban',
              description: `You were banned from **${ctx.guild.name}**.`,
              reason,
              duration: duration ? formatDuration(duration) : null,
              footerText: 'DvL • ban'
            })
          : false;
        const commonFields = [
          { name: 'User', value: `${target.user.tag}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          duration ? { name: 'Duration', value: formatDuration(duration), inline: true } : null,
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Reason', value: reason.slice(0, 1024), inline: false }
        ].filter(Boolean);
        const ok = await target.ban({ reason }).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔨 Ban', 'I could not ban that member. Check my permissions and role position.')] });
        if (duration) ctx.client.tempBans.set(`${ctx.guild.id}:${target.id}`, Date.now() + duration);
        await sendDetailedModerationLog(ctx, '🔨 Member banned', `${target.user.tag} was banned.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🔨 Member banned', `${target.user.tag} was banned.`, target, commonFields, { footerText: 'DvL • member banned' })] });
      }
    }),
    makeSimpleCommand({
      name: 'unban',
      aliases: [],
      category: 'Moderation',
      description: 'Unban a user by ID',
      usage: 'unban <userId>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.BanMembers],
      slash: { root: 'mod', sub: 'unban', description: 'Unban a user by ID', options: [{ type: 'string', name: 'userid', description: 'User ID', required: true }] },
      async execute(ctx) {
        const userId = ctx.getText('userid', 0) || ctx.getText('user', 0) || ctx.args[0];
        if (!userId) return ctx.invalidUsage();
        const fetchedUser = await ctx.client.users.fetch(userId).catch(() => null);
        const ok = await ctx.guild.members.unban(userId).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🕊️ Unban', 'I could not unban that user. Check the ID and my permissions.')] });
        const dmSent = fetchedUser && !fetchedUser.bot
          ? await fetchedUser.send({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🕊️ Unbanned', `You can join **${ctx.guild.name}** again.`, fetchedUser, [
              { name: 'Moderator', value: `${ctx.user}`, inline: true }
            ], { footerText: 'DvL • unbanned' })] }).then(() => true).catch(() => false)
          : false;
        const userLike = fetchedUser || { id: userId, tag: fetchedUser?.tag || `User ${userId}`, displayAvatarURL: () => null };
        const commonFields = [
          { name: 'User', value: fetchedUser ? `${fetchedUser.tag}` : 'Unknown user', inline: true },
          { name: 'User ID', value: `\`${userId}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: fetchedUser ? getDmStatusLabel(dmSent) : 'not available', inline: true }
        ];
        await sendDetailedModerationLog(ctx, '🕊️ User unbanned', `User ID \`${userId}\` was unbanned.`, userLike, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '🕊️ User unbanned', `User ID \`${userId}\` was unbanned.`, userLike, commonFields, { footerText: 'DvL • user unbanned' })] });
      }
    }),
    makeSimpleCommand({
      name: 'nick',
      aliases: ['nickname'],
      category: 'Moderation',
      description: 'Change a member nickname',
      usage: 'nick <@member> <nickname>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageNicknames],
      slash: { root: 'mod', sub: 'nick', description: 'Change a member nickname', options: [{ type: 'user', name: 'target', description: 'Target member', required: true }, { type: 'string', name: 'nickname', description: 'Nickname', required: true }] },
      async execute(ctx) {
        const target = await ctx.getMember('target', 0);
        const nickname = ctx.interaction ? ctx.interaction.options.getString('nickname') : ctx.args.slice(1).join(' ');
        if (!target || !nickname) return ctx.invalidUsage();
        if (!ctx.canActOn(target)) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📝 Nickname', 'You cannot moderate that member.')] });
        const before = target.nickname || target.user.username;
        const ok = await target.setNickname(nickname).then(() => true).catch(() => false);
        if (!ok) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📝 Nickname', 'I could not change that nickname. Check my permissions and role position.')] });
        const dmSent = typeof ctx.client.notifyModerationTarget === 'function'
          ? await ctx.client.notifyModerationTarget(target, ctx.user, {
              action: '📝 Nickname changed',
              title: '📝 Nickname changed',
              description: `Your nickname was updated in **${ctx.guild.name}**.`,
              reason: `Before: ${before} • After: ${nickname}`,
              footerText: 'DvL • nickname'
            })
          : false;
        const commonFields = [
          { name: 'Member', value: `${target}`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Moderator', value: `${ctx.user}`, inline: true },
          { name: 'DM', value: getDmStatusLabel(dmSent), inline: true },
          { name: 'Before', value: clipText(before, 120), inline: true },
          { name: 'After', value: clipText(nickname, 120), inline: true }
        ];
        await sendDetailedModerationLog(ctx, '📝 Nickname changed', `${target} had their nickname updated.`, target, commonFields);
        await ctx.reply({ embeds: [buildMemberActionEmbed(ctx.guildConfig, '📝 Nickname updated', `${target} now uses **${nickname}**.`, target, commonFields, { footerText: 'DvL • nickname updated' })] });
      }
    }),

    makeSimpleCommand({
      name: 'trophy',
      aliases: ['progress', 'serverprogress', 'milestones', 'trophies'],
      category: 'Progress',
      description: 'Show the server trophy board or manage its channel / refresh from one clean command',
      usage: 'trophy [config|refresh|channel <here|#channel|off>]',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'trophy', description: 'Show the server trophy board' },
      async execute(ctx) {
        const sub = String(ctx.args[0] || '').toLowerCase();
        const progress = ctx.guildConfig.progress || { enabled: false, channelId: null, messageId: null };

        if (!sub || ['view', 'show', 'board'].includes(sub)) {
          return ctx.reply({ embeds: [createServerProgressEmbed(ctx.guildConfig, ctx.guild)], components: [] });
        }

        if (['config', 'status'].includes(sub)) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board config', [
            `**Status:** ${progress.enabled ? 'on' : 'off'}`,
            `**Channel:** ${progress.channelId ? `<#${progress.channelId}>` : 'not set'}`,
            `**Message ID:** ${progress.messageId || 'not set'}`,
            '',
            `Use \`${ctx.prefix}trophy channel here\` or \`${ctx.prefix}trophy channel #channel\`.`,
            `Use \`${ctx.prefix}trophy refresh\` to update the live board.`
          ].join('\n'))] });
        }

        if (sub === 'refresh') {
          if (typeof ctx.client.refreshProgressBoard === 'function') {
            const result = await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false });
            if (result?.messageId) {
              return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', `Tableau rafraîchi dans <#${result.channelId}>.`)] });
            }
          }
          return ctx.reply({ embeds: [createServerProgressEmbed(ctx.guildConfig, ctx.guild)], components: [] });
        }

        if (sub === 'channel') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          const pickedChannel = await ctx.getChannel('channel', 1);
          if (rawDestination === 'off') {
            ctx.store.updateGuild(ctx.guild.id, (guild) => {
              guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
              guild.progress.enabled = false;
              guild.progress.channelId = null;
              guild.progress.messageId = null;
              guild.progress.lastUpdatedAt = Date.now();
              return guild;
            });
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', 'Le trophy board auto-update est maintenant désactivé.')] });
          }
          const targetChannel = pickedChannel || (rawDestination === 'here' ? ctx.channel : null);
          if (!targetChannel?.isTextBased?.()) return ctx.invalidUsage(`Examples: \`${ctx.prefix}trophy channel here\`, \`${ctx.prefix}trophy channel #channel\`, \`${ctx.prefix}trophy channel off\`.`);
          let message = null;
          const previousChannel = progress.channelId ? await ctx.guild.channels.fetch(progress.channelId).catch(() => null) : null;
          if (previousChannel?.isTextBased?.() && progress.messageId && previousChannel.id === targetChannel.id) {
            message = await previousChannel.messages.fetch(progress.messageId).catch(() => null);
          }
          const payload = { embeds: [createServerProgressEmbed(ctx.guildConfig, ctx.guild)], components: [] };
          if (message) await message.edit(payload).catch(() => null);
          if (!message) message = await targetChannel.send(payload).catch(() => null);
          if (!message) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', 'Impossible de créer le message du trophy board.')] });
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
            guild.progress.enabled = true;
            guild.progress.channelId = targetChannel.id;
            guild.progress.messageId = message.id;
            guild.progress.lastUpdatedAt = Date.now();
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board ready', `Le tableau de progression du serveur est maintenant dans ${targetChannel}.`)] });
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}trophy\`, \`${ctx.prefix}trophy config\`, \`${ctx.prefix}trophy refresh\`, \`${ctx.prefix}trophy channel here\`.`);
      }
    }),
    makeSimpleCommand({
      name: 'trophychannel',
      aliases: ['progresschannel', 'settrophychannel', 'setprogresschannel'],
      category: 'Progress',
      description: 'Create or move the auto-updating trophy board message',
      usage: 'trophychannel <here|#channel|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tracking', sub: 'trophychannel', description: 'Create or move the trophy board', options: [{ type: 'channel', name: 'channel', description: 'Target text channel', required: false, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const input = String(ctx.getText('value', 0) || ctx.getRest(0) || '').trim().toLowerCase();
        const pickedChannel = await ctx.getChannel('channel', 0);
        if (input === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
            guild.progress.enabled = false;
            guild.progress.channelId = null;
            guild.progress.messageId = null;
            guild.progress.lastUpdatedAt = Date.now();
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', 'Le trophy board auto-update est maintenant désactivé.')] });
        }

        const targetChannel = pickedChannel || (input === 'here' ? ctx.channel : null);
        if (!targetChannel) {
          const progress = ctx.guildConfig.progress || { enabled: false, channelId: null, messageId: null };
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board config', [
            `**Status:** ${progress.enabled ? 'on' : 'off'}`,
            `**Channel:** ${progress.channelId ? `<#${progress.channelId}>` : 'not set'}`,
            `**Message ID:** ${progress.messageId || 'not set'}`,
            '',
            `Use \`${ctx.prefix}trophychannel here\` or \`${ctx.prefix}trophychannel #channel\`.`,
            `Use \`${ctx.prefix}trophychannel off\` to disable it.`
          ].join('\n'))] });
        }
        if (!targetChannel.isTextBased?.()) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', 'Choisis un salon texte.')] });
        }

        let message = null;
        const previousChannel = ctx.guildConfig.progress?.channelId ? await ctx.guild.channels.fetch(ctx.guildConfig.progress.channelId).catch(() => null) : null;
        if (previousChannel?.isTextBased?.() && ctx.guildConfig.progress?.messageId && previousChannel.id === targetChannel.id) {
          message = await previousChannel.messages.fetch(ctx.guildConfig.progress.messageId).catch(() => null);
        }
        const payload = { embeds: [createServerProgressEmbed(ctx.guildConfig, ctx.guild)], components: [] };
        if (message) await message.edit(payload).catch(() => null);
        if (!message) message = await targetChannel.send(payload).catch(() => null);
        if (!message) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', 'Impossible de créer le message du trophy board.')] });

        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
          guild.progress.enabled = true;
          guild.progress.channelId = targetChannel.id;
          guild.progress.messageId = message.id;
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });

        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board ready', `Le tableau de progression du serveur est maintenant dans ${targetChannel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'trophyrefresh',
      aliases: ['progressrefresh', 'refreshtrophy'],
      category: 'Progress',
      description: 'Refresh the trophy board now',
      usage: 'trophyrefresh',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'trophyrefresh', description: 'Refresh the trophy board now' },
      async execute(ctx) {
        if (typeof ctx.client.refreshProgressBoard === 'function') {
          const result = await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false });
          if (result?.messageId) {
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board', `Tableau rafraîchi dans <#${result.channelId}>.`)] });
          }
        }
        await ctx.reply({ embeds: [createServerProgressEmbed(ctx.guildConfig, ctx.guild)], components: [] });
      }
    }),
    makeSimpleCommand({
      name: 'trophyconfig',
      aliases: ['progressconfig', 'trophyboardconfig'],
      category: 'Progress',
      description: 'Show the trophy board configuration',
      usage: 'trophyconfig',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'trophyconfig', description: 'Show the trophy board configuration' },
      async execute(ctx) {
        const progress = ctx.guildConfig.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
        const snapshot = computeServerProgressSnapshot(ctx.guild, ctx.guildConfig);
        const reward = ctx.guildConfig.progress?.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy board config', [
          `**Status:** ${progress.enabled ? 'on' : 'off'}`,
          `**Channel:** ${progress.channelId ? `<#${progress.channelId}>` : 'not set'}`,
          `**Message ID:** ${progress.messageId || 'not set'}`,
          `**Last update:** ${progress.lastUpdatedAt ? `<t:${Math.floor(progress.lastUpdatedAt / 1000)}:R>` : 'never'}`,
          `**Title:** ${progress.title ? `\`${progress.title}\`` : 'default'}`,
          `**Image:** ${progress.imageMode === 'custom' ? 'custom' : progress.imageMode === 'off' ? 'off' : 'server icon'}`,
          '',
          `**Setup progress:** ${snapshot.completionPercent}% • ${snapshot.completedModules}/${snapshot.modules.length}`,
          `**Next member trophy:** ${snapshot.nextGrowth ? snapshot.nextGrowth : 'done'}`,
          `**Next boost trophy:** ${snapshot.nextBoost ? snapshot.nextBoost : 'done'}`,
          `**Next voice trophy:** ${snapshot.nextVoice ? snapshot.nextVoice : 'done'}`,
          `**Member reward:** ${reward.enabled && reward.roleId ? `<@&${reward.roleId}> every ${formatStatNumber(reward.interval || 100)} members` : 'off'}`,
          `**Reward announce:** ${reward.channelId ? `<#${reward.channelId}>` : 'off'}`,
          '',
          `**Custom goal members:** ${ctx.guildConfig.progress?.customGoals?.members ? formatStatNumber(ctx.guildConfig.progress.customGoals.members) : 'off'}`,
          `**Custom goal boosts:** ${ctx.guildConfig.progress?.customGoals?.boosts ? formatStatNumber(ctx.guildConfig.progress.customGoals.boosts) : 'off'}`,
          `**Custom goal voice:** ${ctx.guildConfig.progress?.customGoals?.voice ? formatStatNumber(ctx.guildConfig.progress.customGoals.voice) : 'off'}`
        ].join('\n'))] });
      }
    }),

    makeSimpleCommand({
      name: 'trophygoal',
      aliases: ['progressgoal', 'setgoal', 'goal'],
      category: 'Progress',
      description: 'Set a custom trophy goal for members, boosts or voice activity',
      usage: 'trophygoal <members|boosts|voice> <number|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const type = String(ctx.getText('type', 0) || ctx.args[0] || '').toLowerCase();
        const rawValue = String(ctx.getText('value', 1) || ctx.args[1] || '').toLowerCase();
        const key = ['members', 'boosts', 'voice'].includes(type) ? type : null;
        if (!key || !rawValue) return ctx.invalidUsage();
        if (['off', 'clear', 'reset', 'none'].includes(rawValue)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, customGoals: { members: null, boosts: null, voice: null } };
            guild.progress.customGoals = guild.progress.customGoals || { members: null, boosts: null, voice: null };
            guild.progress.customGoals[key] = null;
            guild.progress.lastUpdatedAt = Date.now();
            return guild;
          });
          if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy goal', `Custom goal for **${key}** cleared.`)] });
        }
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) return ctx.invalidUsage('Example: `+trophygoal members 500` or `+trophygoal voice off`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, customGoals: { members: null, boosts: null, voice: null } };
          guild.progress.customGoals = guild.progress.customGoals || { members: null, boosts: null, voice: null };
          guild.progress.customGoals[key] = Math.round(value);
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy goal', `Custom goal for **${key}** set to **${formatStatNumber(value)}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'trophytitle',
      aliases: ['settrophytitle', 'progresstitle'],
      category: 'Progress',
      description: 'Set a custom title for the trophy board',
      usage: 'trophytitle <text|reset>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const raw = String(ctx.getRest(0) || ctx.getText('text', 0) || '').trim();
        if (!raw) return ctx.invalidUsage('Example: `+trophytitle Neyora 🏆 • Statistiques !` or `+trophytitle reset`.');
        const reset = ['reset', 'default', 'off', 'clear'].includes(raw.toLowerCase());
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
          guild.progress.title = reset ? null : raw.slice(0, 240);
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy title', reset ? 'Titre du trophy board réinitialisé.' : `Nouveau titre: **${raw.slice(0, 240)}**`)] });
      }
    }),
    makeSimpleCommand({
      name: 'trophyimage',
      aliases: ['settrophyimage', 'progressimage'],
      category: 'Progress',
      description: 'Set the thumbnail image used on the trophy board',
      usage: 'trophyimage <url|servericon|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const raw = String(ctx.getRest(0) || ctx.getText('value', 0) || '').trim();
        if (!raw) return ctx.invalidUsage('Example: `+trophyimage https://image.url/pic.png`, `+trophyimage servericon`, `+trophyimage off`.');
        const value = raw.toLowerCase();
        let imageMode = null;
        let imageUrl = null;
        if (['off', 'none', 'clear'].includes(value)) {
          imageMode = 'off';
        } else if (['servericon', 'icon', 'server'].includes(value)) {
          imageMode = 'servericon';
        } else if (/^https?:\/\/\S+$/i.test(raw)) {
          imageMode = 'custom';
          imageUrl = raw;
        } else {
          return ctx.invalidUsage('Use a direct image URL, `servericon`, or `off`.');
        }
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
          guild.progress.imageMode = imageMode;
          guild.progress.imageUrl = imageUrl;
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Trophy image', imageMode === 'custom' ? 'Image perso définie.' : imageMode === 'servericon' ? 'Image du trophy board = icône du serveur.' : 'Image du trophy board désactivée.')] });
      }
    }),
    makeSimpleCommand({
      name: 'milestonerole',
      aliases: ['palierrole', 'membermilestonerole', 'landmarkrole'],
      category: 'Progress',
      description: 'Set the role given to the member who hits each member milestone',
      usage: 'milestonerole <@role|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      async execute(ctx) {
        const raw = String(ctx.getText('value', 0) || ctx.args[0] || '').toLowerCase();
        if (['off', 'none', 'clear'].includes(raw)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
            guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
            guild.progress.memberMilestoneReward.enabled = false;
            guild.progress.memberMilestoneReward.roleId = null;
            guild.progress.lastUpdatedAt = Date.now();
            return guild;
          });
          if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone reward', 'Rôle de palier désactivé.')] });
        }
        const role = await ctx.getRole('role', 0);
        if (!role) return ctx.invalidUsage('Example: `+milestonerole @Founders100` or `+milestonerole off`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
          guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
          guild.progress.memberMilestoneReward.enabled = true;
          guild.progress.memberMilestoneReward.roleId = role.id;
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone reward', `Le membre qui atteint chaque palier recevra ${role}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'milestoneinterval',
      aliases: ['palierinterval', 'membermilestoneinterval', 'landmarkinterval'],
      category: 'Progress',
      description: 'Set the member milestone interval used for milestone rewards',
      usage: 'milestoneinterval <number>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const raw = String(ctx.getText('value', 0) || ctx.args[0] || '').trim().toLowerCase();
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 10) return ctx.invalidUsage('Example: `+milestoneinterval 100` or `+milestoneinterval 250`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
          guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
          guild.progress.memberMilestoneReward.interval = Math.round(value);
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone interval', `Nouveau palier: tous les **${formatStatNumber(value)}** membres.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'milestonechannel',
      aliases: ['palierchannel', 'membermilestonechannel', 'landmarkchannel'],
      category: 'Progress',
      description: 'Set the channel used to announce member milestone rewards',
      usage: 'milestonechannel <here|#channel|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const input = String(ctx.getText('value', 0) || ctx.getRest(0) || '').trim().toLowerCase();
        const pickedChannel = await ctx.getChannel('channel', 0);
        if (['off', 'none', 'clear'].includes(input)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
            guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
            guild.progress.memberMilestoneReward.channelId = null;
            guild.progress.lastUpdatedAt = Date.now();
            return guild;
          });
          if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone channel', 'Salon d’annonce des paliers désactivé.')] });
        }
        const targetChannel = pickedChannel || (input === 'here' ? ctx.channel : null);
        if (!targetChannel?.isTextBased?.()) return ctx.invalidUsage('Use `+milestonechannel here`, `+milestonechannel #annonces`, or `+milestonechannel off`.');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
          guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
          guild.progress.memberMilestoneReward.channelId = targetChannel.id;
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        if (typeof ctx.client.refreshProgressBoard === 'function') await ctx.client.refreshProgressBoard(ctx.guild, { createIfMissing: false }).catch(() => null);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone channel', `Les annonces de palier partiront maintenant dans ${targetChannel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'milestoneconfig',
      aliases: ['palierconfig', 'membermilestoneconfig', 'landmarkconfig'],
      category: 'Progress',
      description: 'Show the member milestone reward setup',
      usage: 'milestoneconfig',
      guildOnly: true,
      async execute(ctx) {
        const reward = ctx.guildConfig.progress?.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
        const nextTarget = getNextMemberRewardTarget(ctx.guild.memberCount || 0, reward.interval);
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏅 Member milestone config', [
          `**Status:** ${reward.enabled && reward.roleId ? 'on' : 'off'}`,
          `**Role:** ${reward.roleId ? `<@&${reward.roleId}>` : 'not set'}`,
          `**Interval:** ${formatStatNumber(reward.interval || 100)}`,
          `**Next reward at:** ${formatStatNumber(nextTarget)}`,
          `**Announcement channel:** ${reward.channelId ? `<#${reward.channelId}>` : 'off'}`,
          `**Already awarded milestones:** ${Array.isArray(reward.awardedCounts) ? reward.awardedCounts.length : 0}`
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'setupcheck',
      aliases: ['healthcheck', 'botcheck', 'servercheck'],
      category: 'System',
      description: 'Check bot readiness, missing permissions and setup gaps',
      usage: 'setupcheck',
      guildOnly: true,
      async execute(ctx) {
        await ctx.reply({ embeds: [createSetupCheckEmbed(ctx.guildConfig, ctx.guild)], components: createDashboardComponents('setup') });
      }
    }),

    makeSimpleCommand({
      name: 'ghostping',
      aliases: ['ghostpingtoggle', 'ghostpingchannel', 'antighostping', 'gpings'],
      category: 'Security',
      description: 'Ping a joining member in a chosen channel, then auto-delete the bot message after 2 seconds',
      usage: 'ghostping <on|off|config|test|here|#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const input = String(ctx.getText('value', 0) || ctx.getRest(0) || '').trim();
        const lowered = input.toLowerCase();
        const currentChannel = ctx.channel;
        const pickedChannel = await ctx.getChannel('channel', 0);

        if (!input || lowered === 'config') {
          const rule = ctx.guildConfig.automod?.ghostPing || { enabled: false, channelId: null };
          return ctx.reply({
            embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping config', [
              `**Status:** ${rule.enabled ? 'on' : 'off'}`,
              `**Ping channel:** ${rule.channelId ? `<#${rule.channelId}>` : 'not set'}`,
              `**Auto-delete:** 2 seconds`,
              '',
              `Use \`${ctx.prefix}ghostping on\` to enable it.`,
              `Use \`${ctx.prefix}ghostping here\` or \`${ctx.prefix}ghostping #channel\` to choose the channel.`,
              `When someone joins the server, the bot pings them once, then deletes the message 2 seconds later.`
            ].join('\n'))]
          });
        }

        if (lowered === 'test' || lowered === 'status') {
          const rule = ctx.guildConfig.automod?.ghostPing || { enabled: false, channelId: null };
          const channelId = rule.channelId || ctx.channel.id;
          const testChannel = channelId ? (ctx.guild.channels.cache.get(channelId) || await ctx.guild.channels.fetch(channelId).catch(() => null)) : null;
          const me = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
          const perms = testChannel?.permissionsFor?.(me) || null;
          const lines = [
            `**Enabled:** ${rule.enabled ? 'on' : 'off'}`,
            `**Ping channel used:** ${testChannel ? `<#${testChannel.id}>` : 'not found'}`,
            `**Auto-delete:** 2 seconds`,
            `**Read channel:** ${perms?.has(PermissionFlagsBits.ViewChannel) ? 'yes' : 'no'}`,
            `**Send messages:** ${perms?.has(PermissionFlagsBits.SendMessages) ? 'yes' : 'no'}`,
            '',
            'Test method:',
            '1. turn ghostping on',
            '2. set the channel with here or #channel',
            '3. join the server with another account',
            '4. the bot should ping that member, then delete the message after 2 seconds'
          ];
          if (!rule.enabled) lines.push('', `Turn it on with \`${ctx.prefix}ghostping on\`.`);
          if (!testChannel) lines.push('', `Set a channel with \`${ctx.prefix}ghostping here\` or \`${ctx.prefix}ghostping #channel\`.`);
          if (testChannel && perms && (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages))) {
            lines.push('', 'The bot is missing permissions in the ping channel.');
          }
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping diagnostic', lines.join('\n'))] });
        }

        if (['on', 'off'].includes(lowered)) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
            guild.automod.ghostPing.enabled = lowered === 'on';
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping', `Join ghost ping is now **${lowered}**.`)] });
        }

        if (lowered === 'here') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
            guild.automod.ghostPing.channelId = currentChannel.id;
            guild.automod.ghostPing.enabled = true;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping', `Joining members will be pinged in ${currentChannel}, then the message will delete after 2 seconds.`)] });
        }

        if (pickedChannel) {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
            guild.automod.ghostPing.channelId = pickedChannel.id;
            guild.automod.ghostPing.enabled = true;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👻 Ghost ping', `Joining members will be pinged in ${pickedChannel}, then the message will delete after 2 seconds.`)] });
        }

        return ctx.invalidUsage('Examples: `+ghostping on`, `+ghostping here`, `+ghostping #welcome`, `+ghostping config`.');
      }
    }),

    ...SECURITY_TOGGLES.map(([name, description, path, aliases]) => createToggleCommand(name, description, path, aliases)),
    makeSimpleCommand({
      name: 'automodconfig',
      aliases: ['securityconfig', 'amconfig'],
      category: 'Security',
      description: 'Show the full AutoMod / security configuration',
      usage: 'automodconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'automodconfig', description: 'Show the AutoMod configuration' },
      async execute(ctx) {
        const mod = ctx.guildConfig.automod || {};
        const ignored = mod.ignoredChannels || [];
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 AutoMod config', [
          `**Anti-spam:** ${automodRuleLabel(mod.antiSpam)}`,
          `**Anti-link:** ${automodRuleLabel(mod.antiLink)}`,
          `**Anti-invite:** ${automodRuleLabel(mod.antiInvite)}`,
          `**Anti-mention:** ${automodRuleLabel(mod.antiMention)}`,
          `**Anti-caps:** ${automodRuleLabel(mod.antiCaps)}`,
          `**Anti-emoji:** ${automodRuleLabel(mod.antiEmojiSpam)}`,
          `**Ghost ping:** **${mod.ghostPing?.enabled ? 'on' : 'off'}**${mod.ghostPing?.channelId ? ` • <#${mod.ghostPing.channelId}>` : ''}`,
          `**Raid mode:** ${automodRuleLabel(mod.raidMode, 'delete')}`,
          `**Blocked words:** **${mod.badWordsEnabled ? 'on' : 'off'}** • ${mod.badWords?.length || 0}`,
          `**Ignored channels:** ${ignored.length ? ignored.map((id) => `<#${id}>`).join(', ') : 'None'}`,
          '',
          `Presets: \`${ctx.prefix}securitypreset balanced\` • \`${ctx.prefix}securitypreset strict\``
        ].join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'securitypreset',
      aliases: ['automodpreset', 'presetsecurity'],
      category: 'Security',
      description: 'Apply a fast security preset',
      usage: 'securitypreset <off|soft|balanced|strict>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'securitypreset', description: 'Apply a security preset', options: [{ type: 'string', name: 'preset', description: 'Preset', required: true, choices: [{ name: 'off', value: 'off' }, { name: 'soft', value: 'soft' }, { name: 'balanced', value: 'balanced' }, { name: 'strict', value: 'strict' }] }] },
      async execute(ctx) {
        const preset = String(ctx.getText('preset', 0) || '').toLowerCase();
        if (!['off', 'soft', 'balanced', 'strict'].includes(preset)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const mod = guild.automod;
          if (preset === 'off') {
            mod.antiSpam.enabled = false;
            mod.antiLink.enabled = false;
            mod.antiInvite.enabled = false;
            mod.antiMention.enabled = false;
            mod.antiCaps.enabled = false;
            mod.antiEmojiSpam.enabled = false;
            mod.raidMode.enabled = false;
            return guild;
          }
          const strictness = preset === 'soft' ? 0 : (preset === 'balanced' ? 1 : 2);
          mod.antiSpam = { ...mod.antiSpam, enabled: true, maxMessages: strictness === 0 ? 8 : (strictness === 1 ? 6 : 5), perSeconds: strictness === 0 ? 6 : 5, punish: strictness === 2 ? 'timeout' : 'delete' };
          mod.antiLink = { ...mod.antiLink, enabled: true, punish: strictness >= 1 ? 'delete' : 'delete' };
          mod.antiInvite = { ...mod.antiInvite, enabled: true, punish: strictness >= 1 ? 'delete' : 'delete' };
          mod.antiMention = { ...mod.antiMention, enabled: true, maxMentions: strictness === 0 ? 7 : (strictness === 1 ? 5 : 4), punish: strictness === 2 ? 'timeout' : 'delete' };
          mod.antiCaps = { ...mod.antiCaps, enabled: true, minLength: strictness === 0 ? 14 : 10, percent: strictness === 2 ? 65 : 80, punish: 'delete' };
          mod.antiEmojiSpam = { ...mod.antiEmojiSpam, enabled: true, maxEmojis: strictness === 0 ? 12 : (strictness === 1 ? 8 : 6), punish: 'delete' };
          mod.raidMode = { ...mod.raidMode, enabled: strictness >= 1, joinAgeMinutes: strictness === 2 ? 20160 : 10080 };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Security preset', `Preset **${preset}** applied.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setantispam',
      aliases: ['antispamset'],
      category: 'Security',
      description: 'Set anti-spam threshold and action',
      usage: 'setantispam <maxMessages> <seconds> [delete|timeout]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'setantispam', description: 'Configure anti-spam', options: [
        { type: 'integer', name: 'max', description: 'Max messages', required: true, minValue: 2, maxValue: 20 },
        { type: 'integer', name: 'seconds', description: 'Time window in seconds', required: true, minValue: 2, maxValue: 30 },
        { type: 'string', name: 'action', description: 'Punishment', required: false, choices: AUTOMOD_PUNISH_CHOICES }
      ] },
      async execute(ctx) {
        const maxMessages = Number(ctx.getText('max', 0));
        const seconds = Number(ctx.getText('seconds', 1));
        const punish = String(ctx.getText('action', 2) || ctx.args[2] || 'delete').toLowerCase();
        if (!Number.isInteger(maxMessages) || !Number.isInteger(seconds) || !AUTOMOD_PUNISH_CHOICES.some((entry) => entry.value === punish)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.antiSpam = { ...guild.automod.antiSpam, enabled: true, maxMessages, perSeconds: seconds, punish };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Anti-spam updated', `Now blocking at **${maxMessages}** message(s) in **${seconds}s** • action: **${punish}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setantimention',
      aliases: ['antimentionset'],
      category: 'Security',
      description: 'Set anti-mention spam threshold and action',
      usage: 'setantimention <maxMentions> [delete|timeout]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'setantimention', description: 'Configure anti-mention spam', options: [
        { type: 'integer', name: 'max', description: 'Max mentions', required: true, minValue: 2, maxValue: 30 },
        { type: 'string', name: 'action', description: 'Punishment', required: false, choices: AUTOMOD_PUNISH_CHOICES }
      ] },
      async execute(ctx) {
        const maxMentions = Number(ctx.getText('max', 0));
        const punish = String(ctx.getText('action', 1) || ctx.args[1] || 'delete').toLowerCase();
        if (!Number.isInteger(maxMentions) || !AUTOMOD_PUNISH_CHOICES.some((entry) => entry.value === punish)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.antiMention = { ...guild.automod.antiMention, enabled: true, maxMentions, punish };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Anti-mention updated', `Now blocking at **${maxMentions}** mention(s) • action: **${punish}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setanticaps',
      aliases: ['anticapsset'],
      category: 'Security',
      description: 'Set anti-caps trigger and action',
      usage: 'setanticaps <minLength> <percent> [delete|timeout]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'setanticaps', description: 'Configure anti-caps', options: [
        { type: 'integer', name: 'minlength', description: 'Minimum letters', required: true, minValue: 4, maxValue: 80 },
        { type: 'integer', name: 'percent', description: 'Caps percent', required: true, minValue: 50, maxValue: 100 },
        { type: 'string', name: 'action', description: 'Punishment', required: false, choices: AUTOMOD_PUNISH_CHOICES }
      ] },
      async execute(ctx) {
        const minLength = Number(ctx.getText('minlength', 0));
        const percent = Number(ctx.getText('percent', 1));
        const punish = String(ctx.getText('action', 2) || ctx.args[2] || 'delete').toLowerCase();
        if (!Number.isInteger(minLength) || !Number.isInteger(percent) || !AUTOMOD_PUNISH_CHOICES.some((entry) => entry.value === punish)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.antiCaps = { ...guild.automod.antiCaps, enabled: true, minLength, percent, punish };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Anti-caps updated', `Trigger: **${percent}%** caps after **${minLength}** letters • action: **${punish}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setantiemoji',
      aliases: ['antiemojiset'],
      category: 'Security',
      description: 'Set anti-emoji spam threshold and action',
      usage: 'setantiemoji <maxEmojis> [delete|timeout]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'setantiemoji', description: 'Configure anti-emoji spam', options: [
        { type: 'integer', name: 'max', description: 'Max emojis', required: true, minValue: 2, maxValue: 50 },
        { type: 'string', name: 'action', description: 'Punishment', required: false, choices: AUTOMOD_PUNISH_CHOICES }
      ] },
      async execute(ctx) {
        const maxEmojis = Number(ctx.getText('max', 0));
        const punish = String(ctx.getText('action', 1) || ctx.args[1] || 'delete').toLowerCase();
        if (!Number.isInteger(maxEmojis) || !AUTOMOD_PUNISH_CHOICES.some((entry) => entry.value === punish)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.antiEmojiSpam = { ...guild.automod.antiEmojiSpam, enabled: true, maxEmojis, punish };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Anti-emoji updated', `Now blocking at **${maxEmojis}** emoji(s) • action: **${punish}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setraidage',
      aliases: ['raidageset'],
      category: 'Security',
      description: 'Set the minimum account age checked by raid mode',
      usage: 'setraidage <minutes>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'setraidage', description: 'Set raid mode account age', options: [{ type: 'integer', name: 'minutes', description: 'Account age in minutes', required: true, minValue: 10, maxValue: 525600 }] },
      async execute(ctx) {
        const joinAgeMinutes = Number(ctx.getText('minutes', 0));
        if (!Number.isInteger(joinAgeMinutes)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.raidMode = { ...guild.automod.raidMode, enabled: true, joinAgeMinutes };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Raid mode age', `Raid mode now checks for accounts newer than **${joinAgeMinutes}** minute(s).`)] });
      }
    }),
    makeSimpleCommand({
      name: 'automodignore',
      aliases: ['ignoreautomod'],
      category: 'Security',
      description: 'Ignore a channel for AutoMod checks',
      usage: 'automodignore <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'automodignore', description: 'Ignore a channel for AutoMod', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.ignoredChannels = guild.automod.ignoredChannels || [];
          if (!guild.automod.ignoredChannels.includes(channel.id)) guild.automod.ignoredChannels.push(channel.id);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 AutoMod ignore', `${channel} is now ignored by AutoMod.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'automodunignore',
      aliases: ['unignoreautomod'],
      category: 'Security',
      description: 'Remove a channel from the AutoMod ignore list',
      usage: 'automodunignore <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'automodunignore', description: 'Unignore a channel for AutoMod', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.ignoredChannels = (guild.automod.ignoredChannels || []).filter((id) => id !== channel.id);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 AutoMod ignore', `${channel} was removed from the ignore list.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'automodignored',
      aliases: ['ignoredchannels'],
      category: 'Security',
      description: 'Show channels ignored by AutoMod',
      usage: 'automodignored',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'automodignored', description: 'Show ignored AutoMod channels' },
      async execute(ctx) {
        const list = ctx.guildConfig.automod?.ignoredChannels || [];
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚨 Ignored channels', list.length ? list.map((id) => `• <#${id}>`).join('\n') : 'No ignored channels.')] });
      }
    }),
    makeSimpleCommand({
      name: 'badwordadd',
      aliases: ['addbadword'],
      category: 'Security',
      description: 'Add a blocked word',
      usage: 'badwordadd <word>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'badwordadd', description: 'Add a blocked word', options: [{ type: 'string', name: 'word', description: 'Blocked word', required: true }] },
      async execute(ctx) {
        const word = (ctx.getText('word', 0) || '').toLowerCase();
        if (!word) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.badWordsEnabled = true;
          if (!guild.automod.badWords.includes(word)) guild.automod.badWords.push(word);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚫 Bad words', `Added **${word}** to the blocked list.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'badwordremove',
      aliases: ['removebadword'],
      category: 'Security',
      description: 'Remove a blocked word',
      usage: 'badwordremove <word>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'badwordremove', description: 'Remove a blocked word', options: [{ type: 'string', name: 'word', description: 'Blocked word', required: true }] },
      async execute(ctx) {
        const word = (ctx.getText('word', 0) || '').toLowerCase();
        if (!word) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.badWords = guild.automod.badWords.filter((entry) => entry !== word);
          guild.automod.badWordsEnabled = guild.automod.badWords.length > 0;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✅ Bad words', `Removed **${word}** from the blocked list.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'badwords',
      aliases: ['badwordlist'],
      category: 'Security',
      description: 'List blocked words',
      usage: 'badwords',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'badwords', description: 'List blocked words' },
      async execute(ctx) {
        const list = ctx.guildConfig.automod.badWords;
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🗒️ Blocked words', list.length ? list.map((word) => `• ${word}`).join('\n') : 'No blocked words configured.')] });
      }
    }),
    makeSimpleCommand({
      name: 'wl',
      aliases: ['whitelist', 'allow'],
      category: 'Security',
      description: 'Whitelist a member or role from automod',
      usage: 'wl <@member|@role|id>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'wl', description: 'Whitelist a member or role from automod', options: [{ type: 'user', name: 'user', description: 'User', required: false }, { type: 'role', name: 'role', description: 'Role', required: false }] },
      async execute(ctx) {
        const user = ctx.interaction ? ctx.interaction.options.getUser('user') : ctx.message?.mentions.users.first();
        const role = ctx.interaction ? ctx.interaction.options.getRole('role') : ctx.message?.mentions.roles.first();
        const raw = String(ctx.args[0] || '').trim();
        if (!user && !role && ['list', 'view', 'show'].includes(raw.toLowerCase())) {
          return ctx.reply({ embeds: await buildWhitelistEmbeds(ctx) });
        }
        if (!user && !role && raw.toLowerCase() === 'clean') {
          const overview = await cleanWhitelistEntries(ctx);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧹 Whitelist cleaned', [
            `**Users kept:** ${overview.users.length}`,
            `**Roles kept:** ${overview.roles.length}`,
            `**Broken users removed:** ${overview.brokenUsers.length}`,
            `**Broken roles removed:** ${overview.brokenRoles.length}`
          ].join('\n'))] });
        }
        if (!user && !role && !raw) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          if (user) {
            if (!guild.automod.whitelistUserIds.includes(user.id)) guild.automod.whitelistUserIds.push(user.id);
          } else if (role) {
            if (!guild.automod.whitelistRoleIds.includes(role.id)) guild.automod.whitelistRoleIds.push(role.id);
          } else if (/^\d{17,20}$/.test(raw)) {
            if (!guild.automod.whitelistUserIds.includes(raw)) guild.automod.whitelistUserIds.push(raw);
          }
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✅ Whitelist', `${user || role || raw} added to the automod whitelist.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'unwl',
      aliases: ['unwhitelist', 'unallow'],
      category: 'Security',
      description: 'Remove a member or role from automod whitelist',
      usage: 'unwl <@member|@role|id>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'unwl', description: 'Remove a member or role from automod whitelist', options: [{ type: 'user', name: 'user', description: 'User', required: false }, { type: 'role', name: 'role', description: 'Role', required: false }] },
      async execute(ctx) {
        const user = ctx.interaction ? ctx.interaction.options.getUser('user') : ctx.message?.mentions.users.first();
        const role = ctx.interaction ? ctx.interaction.options.getRole('role') : ctx.message?.mentions.roles.first();
        const raw = ctx.args[0];
        if (!user && !role && !raw) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          if (user) guild.automod.whitelistUserIds = guild.automod.whitelistUserIds.filter((id) => id !== user.id);
          else if (role) guild.automod.whitelistRoleIds = guild.automod.whitelistRoleIds.filter((id) => id !== role.id);
          else if (/^\d{17,20}$/.test(raw)) guild.automod.whitelistUserIds = guild.automod.whitelistUserIds.filter((id) => id !== raw);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧹 Whitelist', `${user || role || raw} removed from the automod whitelist.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'whitelistlist',
      aliases: ['wllist'],
      category: 'Security',
      description: 'Show the automod whitelist',
      usage: 'whitelistlist',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'security', sub: 'whitelistlist', description: 'Show the automod whitelist' },
      async execute(ctx) {
        await ctx.reply({ embeds: await buildWhitelistEmbeds(ctx) });
      }
    }),

    makeSimpleCommand({
      name: 'autoroleadd',
      aliases: ['addautorole'],
      category: 'Roles',
      description: 'Add an auto role',
      usage: 'autoroleadd <@role>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'autoroleadd', description: 'Add an auto role', options: [{ type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        if (!role) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { if (!guild.roles.autoRoles.includes(role.id)) guild.roles.autoRoles.push(role.id); return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto role', `${role} added to auto roles.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'autoroleremove',
      aliases: ['removeautorole'],
      category: 'Roles',
      description: 'Remove an auto role',
      usage: 'autoroleremove <@role>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'autoroleremove', description: 'Remove an auto role', options: [{ type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        if (!role) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.roles.autoRoles = guild.roles.autoRoles.filter((id) => id !== role.id); return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Auto role', `${role} removed from auto roles.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'autorolelist',
      aliases: ['autoroles'],
      category: 'Roles',
      description: 'List auto roles',
      usage: 'autorolelist',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'autorolelist', description: 'List auto roles' },
      async execute(ctx) {
        await ctx.reply({ embeds: await buildAutoRoleEmbeds(ctx) });
      }
    }),
    makeSimpleCommand({
      name: 'rolepanel',
      aliases: ['buttonrole', 'reactbuttonrole'],
      category: 'Roles',
      description: 'Create a role button panel',
      usage: 'rolepanel <@role> [label]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'rolepanel', description: 'Create a role button panel', options: [{ type: 'role', name: 'role', description: 'Role', required: true }, { type: 'string', name: 'label', description: 'Button label', required: false }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        const label = ctx.interaction ? (ctx.interaction.options.getString('label') || role?.name) : (ctx.getRest(1) || role?.name);
        if (!role) return ctx.invalidUsage();
        const panelId = crypto.randomBytes(6).toString('hex');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rolepanel:${panelId}:${role.id}`).setLabel(label.slice(0, 80)).setStyle(ButtonStyle.Primary)
        );
        const sent = await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎛️ Role Panel', `Click the button to toggle ${role}.`)], components: [row] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.roles.rolePanels[panelId] = { roleId: role.id, messageId: sent.id, channelId: sent.channel.id, label };
          return guild;
        });
      }
    }),

    makeSimpleCommand({
      name: 'reactbutton',
      aliases: ['rb', 'reactpanel'],
      category: 'Roles',
      description: 'Add either a reaction role or a role button to an existing message',
      usage: 'reactbutton <button|reaction> <messageId> <@role> <emoji?> [label]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'reactbutton', description: 'Create a role reaction or button', options: [
        { type: 'string', name: 'mode', description: 'button or reaction', required: true, choices: [{ name: 'button', value: 'button' }, { name: 'reaction', value: 'reaction' }] },
        { type: 'string', name: 'messageid', description: 'Target message ID in this channel', required: true },
        { type: 'role', name: 'role', description: 'Role to give', required: true },
        { type: 'string', name: 'emoji', description: 'Emoji for reaction or button', required: false },
        { type: 'string', name: 'label', description: 'Button label', required: false }
      ] },
      async execute(ctx) {
        const mode = (ctx.getText('mode', 0) || '').toLowerCase();
        const messageInput = ctx.getText('messageid', 1);
        const role = await ctx.getRole('role', 2);
        const emoji = ctx.interaction ? ctx.interaction.options.getString('emoji') : ctx.args[3] || null;
        const label = ctx.interaction ? ctx.interaction.options.getString('label') : ctx.getRest(4);
        if (!['button', 'reaction'].includes(mode)) return ctx.invalidUsage('First argument must be `button` or `reaction`.');
        if (!messageInput || !role) return ctx.invalidUsage();

        let targetChannel = ctx.channel;
        let targetMessageId = messageInput;
        const linkMatch = String(messageInput).match(/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/i);
        if (linkMatch) {
          targetChannel = await ctx.guild.channels.fetch(linkMatch[1]).catch(() => null);
          targetMessageId = linkMatch[2];
        }
        if (!targetChannel?.isTextBased?.()) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Roles', 'Target channel not found or not text-based.')] });
        const target = await targetChannel.messages.fetch(targetMessageId).catch(() => null);
        if (!target) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Roles', 'Message not found. Use a message ID from this channel or a full Discord message link.')] });

        if (mode === 'reaction') {
          if (!emoji) return ctx.invalidUsage('Reaction mode needs an emoji.');
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.roles.reactionRoles[target.id] = guild.roles.reactionRoles[target.id] || { pairs: [] };
            guild.roles.reactionRoles[target.id].pairs.push({ emoji, roleId: role.id });
            return guild;
          });
          await target.react(emoji).catch(() => null);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Reaction role', `${emoji} now gives ${role} on [this message](${target.url}).`)] });
        }

        const panelId = crypto.randomBytes(6).toString('hex');
        const button = new ButtonBuilder()
          .setCustomId(`rolepanel:${panelId}:${role.id}`)
          .setLabel((label || role.name).slice(0, 80))
          .setStyle(ButtonStyle.Primary);
        if (emoji) button.setEmoji(emoji);

        let panelMessage = null;
        const targetIsEditable = target.author?.id === ctx.client.user?.id;
        if (targetIsEditable) {
          const rows = target.components?.map((row) => ActionRowBuilder.from(row)) || [];
          let placed = false;
          for (const row of rows) {
            if (row.components.length < 5) {
              row.addComponents(button);
              placed = true;
              break;
            }
          }
          const nextRows = placed ? rows : [...rows, new ActionRowBuilder().addComponents(button)];
          if (nextRows.length <= 5) panelMessage = await target.edit({ components: nextRows }).catch(() => null);
        }

        if (!panelMessage) {
          panelMessage = await target.channel.send({
            content: `Linked role button for [this message](${target.url})`,
            components: [new ActionRowBuilder().addComponents(button)]
          }).catch(() => null);
        }

        if (!panelMessage) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Roles', 'I could not place the button. I need permission to edit my own message or send a linked panel in the target channel.')] });
        }

        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.roles.rolePanels[panelId] = { roleId: role.id, messageId: panelMessage.id, channelId: panelMessage.channel.id, label: label || role.name };
          return guild;
        });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎛️ Role button', targetIsEditable && panelMessage.id === target.id ? `Added a role button for ${role} on [this message](${target.url}).` : `Created a linked button panel [here](${panelMessage.url}) for ${role}.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'rradd',
      aliases: ['reactionrole', 'reactionroleadd'],
      category: 'Roles',
      description: 'Add a reaction role to a message',
      usage: 'rradd <messageId> <emoji> <@role>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'rradd', description: 'Add a reaction role', options: [{ type: 'string', name: 'messageid', description: 'Message ID', required: true }, { type: 'string', name: 'emoji', description: 'Emoji', required: true }, { type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const messageId = ctx.getText('messageid', 0);
        const emoji = ctx.getText('emoji', 1);
        const role = await ctx.getRole('role', 2);
        if (!messageId || !emoji || !role) return ctx.invalidUsage();
        const target = await ctx.channel.messages.fetch(messageId).catch(() => null);
        if (!target) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Reaction roles', 'Message not found in this channel.')] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.roles.reactionRoles[messageId] = guild.roles.reactionRoles[messageId] || { pairs: [] };
          guild.roles.reactionRoles[messageId].pairs.push({ emoji, roleId: role.id });
          return guild;
        });
        await target.react(emoji).catch(() => null);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Reaction role', `${emoji} now gives ${role}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'rrremove',
      aliases: ['reactionroleremove'],
      category: 'Roles',
      description: 'Remove a reaction role from a message',
      usage: 'rrremove <messageId> <emoji>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'rrremove', description: 'Remove a reaction role', options: [{ type: 'string', name: 'messageid', description: 'Message ID', required: true }, { type: 'string', name: 'emoji', description: 'Emoji', required: true }] },
      async execute(ctx) {
        const messageId = ctx.getText('messageid', 0);
        const emoji = ctx.getText('emoji', 1);
        if (!messageId || !emoji) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const entry = guild.roles.reactionRoles[messageId];
          if (entry) entry.pairs = entry.pairs.filter((pair) => pair.emoji !== emoji);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎭 Reaction role', `Removed ${emoji} from message **${messageId}**.`)] });
      }
    }),


    makeSimpleCommand({
      name: 'setstatusrole',
      aliases: ['statusrole', 'rolesupport', 'setrolesupport'],
      category: 'Roles',
      description: 'Give a role to members whose custom status contains a text',
      usage: 'setstatusrole <@role> <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'setstatusrole', description: 'Set the custom-status support role', options: [{ type: 'role', name: 'role', description: 'Role to give', required: true }, { type: 'string', name: 'text', description: 'Text to match in custom status', required: true }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        const textValue = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(1);
        if (!role || !textValue) return ctx.invalidUsage('Example: `+setstatusrole @Supporter discord.gg/yourserver`');
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.roles.statusRole.roleId = role.id;
          guild.roles.statusRole.matchText = textValue;
          guild.roles.statusRole.enabled = true;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✨ Status role', `${role} will now be given when a member custom status contains:

> ${textValue}`)] });
      }
    }),
    makeSimpleCommand({
      name: 'statusroletoggle',
      aliases: ['togglestatusrole'],
      category: 'Roles',
      description: 'Toggle the custom-status support role system',
      usage: 'statusroletoggle on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'statusroletoggle', description: 'Toggle the custom-status support role', options: [{ type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.roles.statusRole.enabled = state === 'on'; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✨ Status role', `Status role system is now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'statusroleconfig',
      aliases: ['rolesupportconfig'],
      category: 'Roles',
      description: 'Show the current custom-status role configuration',
      usage: 'statusroleconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'statusroleconfig', description: 'Show the custom-status role configuration' },
      async execute(ctx) {
        const rule = ctx.guildConfig.roles.statusRole || {};
        const desc = [
          `**Enabled:** ${rule.enabled ? 'yes' : 'no'}`,
          `**Role:** ${rule.roleId ? `<@&${rule.roleId}>` : 'not set'}`,
          `**Match text:** ${rule.matchText ? `\`${rule.matchText}\`` : 'not set'}`,
          `**Mode:** ${rule.mode || 'includes'}`,
          `**Auto remove:** ${rule.removeWhenMissing === false ? 'no' : 'yes'}`
        ].join('\n');
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📋 Status role config', desc)] });
      }
    }),
    makeSimpleCommand({
      name: 'clearstatusrole',
      aliases: ['resetstatusrole'],
      category: 'Roles',
      description: 'Clear the custom-status role configuration',
      usage: 'clearstatusrole',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'clearstatusrole', description: 'Clear the custom-status role configuration' },
      async execute(ctx) {
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.roles.statusRole = { enabled: false, roleId: null, matchText: '', mode: 'includes', removeWhenMissing: true };
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🧹 Status role', 'Status role configuration cleared.')] });
      }
    }),
    makeSimpleCommand({
      name: 'statusrolecheck',
      aliases: ['rolesupportcheck', 'syncstatusrole'],
      category: 'Roles',
      description: 'Scan members and refresh the custom-status role',
      usage: 'statusrolecheck',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      slash: { root: 'roles', sub: 'statusrolecheck', description: 'Rescan members for the custom-status role' },
      async execute(ctx) {
        const result = await ctx.client.syncStatusRoleForGuild(ctx.guild);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🔄 Status role sync', `Checked **${result.checked}** member(s).
Matched: **${result.matched}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'welcometoggle',
      aliases: ['jointoggle'],
      category: 'Welcome',
      description: 'Toggle welcome messages',
      usage: 'welcometoggle on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'welcometoggle', description: 'Toggle welcome messages', options: [{ type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.enabled = state === 'on'; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome', `Welcome messages are now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setwelcomechannel',
      aliases: ['welcomechannel', 'setjoinchannel', 'joinchannel'],
      category: 'Welcome',
      description: 'Set the welcome channel',
      usage: 'setwelcomechannel <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setwelcomechannel', description: 'Set the welcome channel', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.channelId = channel.id; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome channel', `Welcome channel set to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setwelcomemessage',
      aliases: ['welcomemessage', 'setjoinmessage', 'joinmessage'],
      category: 'Welcome',
      description: 'Set the welcome message template',
      usage: 'setwelcomemessage <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setwelcomemessage', description: 'Set the welcome message template', options: [{ type: 'string', name: 'text', description: 'Template', required: true }] },
      async execute(ctx) {
        const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!text) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.message = text; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome message', 'Welcome message updated. Variables: `{user}`, `{userTag}`, `{server}`')] });
      }
    }),
    makeSimpleCommand({
      name: 'leavetoggle',
      aliases: ['goodbye', 'leavetogglealias'],
      category: 'Welcome',
      description: 'Toggle leave messages',
      usage: 'leavetoggle on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'leavetoggle', description: 'Toggle leave messages', options: [{ type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.enabled = state === 'on'; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave', `Leave messages are now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setleavechannel',
      aliases: ['leavechannel', 'goodbyechannel'],
      category: 'Welcome',
      description: 'Set the leave channel',
      usage: 'setleavechannel <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setleavechannel', description: 'Set the leave channel', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.channelId = channel.id; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave channel', `Leave channel set to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setleavemessage',
      aliases: ['leavemessage', 'goodbyemessage'],
      category: 'Welcome',
      description: 'Set the leave message template',
      usage: 'setleavemessage <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setleavemessage', description: 'Set the leave message template', options: [{ type: 'string', name: 'text', description: 'Template', required: true }] },
      async execute(ctx) {
        const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!text) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.message = text; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave message', 'Leave message updated. Variables: `{user}`, `{userTag}`, `{server}`')] });
      }
    }),


    makeSimpleCommand({
      name: 'setwelcometitle',
      aliases: ['welcometitle', 'setjointitle', 'jointitle'],
      category: 'Welcome',
      description: 'Set the welcome embed title',
      usage: 'setwelcometitle <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setwelcometitle', description: 'Set the welcome embed title', options: [{ type: 'string', name: 'text', description: 'Title', required: true }] },
      async execute(ctx) {
        const textValue = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!textValue) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.title = textValue; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome title', `Welcome title set to **${textValue}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'previewwelcome',
      aliases: ['testwelcome'],
      category: 'Welcome',
      description: 'Preview the current welcome message',
      usage: 'previewwelcome [@member]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'previewwelcome', description: 'Preview the welcome message', options: [{ type: 'user', name: 'target', description: 'Member to preview with', required: false }] },
      async execute(ctx) {
        const member = await ctx.getMember('target', 0) || ctx.member;
        const vars = getTextTemplateVars(ctx.guild, member);
        await ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.welcome, vars, { fallbackTitle: '👋 Welcome' }));
      }
    }),
    makeSimpleCommand({
      name: 'setleavetitle',
      aliases: ['leavetitle', 'goodbyetitle'],
      category: 'Welcome',
      description: 'Set the leave embed title',
      usage: 'setleavetitle <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setleavetitle', description: 'Set the leave embed title', options: [{ type: 'string', name: 'text', description: 'Title', required: true }] },
      async execute(ctx) {
        const textValue = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!textValue) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.title = textValue; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave title', `Leave title set to **${textValue}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'previewleave',
      aliases: ['testleave'],
      category: 'Welcome',
      description: 'Preview the current leave message',
      usage: 'previewleave [@member]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'previewleave', description: 'Preview the leave message', options: [{ type: 'user', name: 'target', description: 'Member to preview with', required: false }] },
      async execute(ctx) {
        const member = await ctx.getMember('target', 0) || ctx.member;
        const vars = getTextTemplateVars(ctx.guild, member);
        await ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.leave, vars, { fallbackTitle: '👋 Member left' }));
      }
    }),

    makeSimpleCommand({
      name: 'boosttoggle',
      aliases: ['boostalerts', 'boostannounce'],
      category: 'Welcome',
      description: 'Toggle boost announcements',
      usage: 'boosttoggle on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'boosttoggle', description: 'Toggle boost announcements', options: [{ type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.enabled = state === 'on'; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost alerts', `Boost announcements are now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setboostchannel',
      aliases: ['boostchannel'],
      category: 'Logs',
      description: 'Set the boost announcement channel',
      usage: 'setboostchannel <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setboostchannel', description: 'Set the boost announcement channel', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.channelId = channel.id; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost channel', `Boost channel set to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setboostmessage',
      aliases: ['boostmessage'],
      category: 'Logs',
      description: 'Set the boost message template',
      usage: 'setboostmessage <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setboostmessage', description: 'Set the boost message template', options: [{ type: 'string', name: 'text', description: 'Template', required: true }] },
      async execute(ctx) {
        const textValue = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!textValue) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.message = textValue; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost message', 'Boost message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{boostCount}`, `{boostTier}`')] });
      }
    }),
    makeSimpleCommand({
      name: 'setboosttitle',
      aliases: ['boosttitle'],
      category: 'Logs',
      description: 'Set the boost embed title',
      usage: 'setboosttitle <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'setboosttitle', description: 'Set the boost embed title', options: [{ type: 'string', name: 'text', description: 'Title', required: true }] },
      async execute(ctx) {
        const textValue = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(0);
        if (!textValue) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.title = textValue; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost title', `Boost title set to **${textValue}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'previewboost',
      aliases: ['testboost'],
      category: 'Logs',
      description: 'Preview the current boost message',
      usage: 'previewboost [@member]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'previewboost', description: 'Preview the boost message', options: [{ type: 'user', name: 'target', description: 'Member to preview with', required: false }] },
      async execute(ctx) {
        const member = await ctx.getMember('target', 0) || ctx.member;
        const vars = getTextTemplateVars(ctx.guild, member);
        await ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.boost, vars, { fallbackTitle: '🚀 New boost' }));
      }
    }),
    makeSimpleCommand({
      name: 'boostconfig',
      aliases: ['viewboostconfig'],
      category: 'Logs',
      description: 'Show the current boost configuration',
      usage: 'boostconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'boostconfig', description: 'Show the current boost configuration' },
      async execute(ctx) {
        const b = ctx.guildConfig.boost;
        const desc = [
          '*Boost stays in logs/tracking. This command only shows the announcement style.*',
          '',
          `**Boost alerts:** ${b.enabled ? 'on' : 'off'} • ${b.channelId ? `<#${b.channelId}>` : 'no channel'}`,
          `**Boost mode:** ${getAnnouncementModeLabel(b.mode)}`,
          `**Boost title:** ${formatTemplatePreview(b.title, 'none')}`,
          `**Boost message:** ${formatTemplatePreview(b.message)}`,
          `**Boost footer:** ${formatTemplatePreview(b.footer, 'DvL')}`,
          `**Boost color:** ${code(b.color || ctx.guildConfig.embedColor)}`,
          `**Boost image:** ${formatTemplatePreview(b.imageUrl, 'none')}`
        ].join('\n');
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost config', desc.slice(0, 4000))] });
      }
    }),

    makeSimpleCommand({
      name: 'welcomeconfig',
      aliases: ['joinconfig', 'leaveconfig'],
      category: 'Welcome',
      description: 'Show the current join/leave configuration',
      usage: 'welcomeconfig',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'welcome', sub: 'welcomeconfig', description: 'Show the join/leave configuration' },
      async execute(ctx) {
        const w = ctx.guildConfig.welcome; const l = ctx.guildConfig.leave; const b = ctx.guildConfig.boost;
        const desc = [
          `**Welcome:** ${w.enabled ? 'on' : 'off'} • ${w.channelId ? `<#${w.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(w.mode)}`,
          `**Welcome title:** ${formatTemplatePreview(w.title, 'none')}`,
          `**Welcome message:** ${formatTemplatePreview(w.message)}`,
          `**Welcome footer:** ${formatTemplatePreview(w.footer, 'DvL')}`,
          '',
          `**Leave:** ${l.enabled ? 'on' : 'off'} • ${l.channelId ? `<#${l.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(l.mode)}`,
          `**Leave title:** ${formatTemplatePreview(l.title, 'none')}`,
          `**Leave message:** ${formatTemplatePreview(l.message)}`,
          `**Leave DM:** ${l.dmEnabled ? 'on' : 'off'} • ${getAnnouncementModeLabel(l.dmMode)}`,
          `**Leave DM title:** ${formatTemplatePreview(l.dmTitle, 'none')}`,
          `**Leave DM message:** ${formatTemplatePreview(l.dmMessage)}`,
          '',
          `**Boost:** ${b.enabled ? 'on' : 'off'} • ${b.channelId ? `<#${b.channelId}>` : 'no channel'} • ${getAnnouncementModeLabel(b.mode)}`,
          `**Boost title:** ${formatTemplatePreview(b.title, 'none')}`,
          `**Boost message:** ${formatTemplatePreview(b.message)}`,
          `**Boost footer:** ${formatTemplatePreview(b.footer, 'DvL')}`
        ].join('\n');
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📋 Welcome config', desc.slice(0, 4000))] });
      }
    }),

    makeSimpleCommand({
      name: 'welcome',
      aliases: ['welcomehub', 'welcomesetup', 'welcomestyle'],
      category: 'Welcome',
      description: 'Advanced welcome module hub with embed/plain style controls',
      usage: 'welcome [view|on|off|channel <here|#channel>|mode <embed|plain>|title <text|off>|message <text>|footer <text|off>|image <url|off>|color <hex|default>|vars|example|reset|test [@member]]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();

        if (['view', 'config', 'show', 'list', 'help', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildWelcomeModuleEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['vars', 'variables'].includes(action)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'vars')] });
        if (['example', 'examples'].includes(action)) return ctx.reply({ embeds: [buildTextExamplesEmbed(ctx.guildConfig, 'welcome', ctx.prefix)] });

        if (action === 'reset') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome = JSON.parse(JSON.stringify(DEFAULT_GUILD.welcome)); return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome reset', 'Welcome module reset to default settings.')] });
        }

        if (action === 'on' || action === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.enabled = action === 'on'; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome', `Welcome messages are now **${action}**.`)] });
        }

        if (action === 'channel') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          let channel = null;
          if (rawDestination === 'here' && ctx.channel?.isTextBased?.()) channel = ctx.channel;
          if (!channel) channel = await ctx.getChannel('channel', 1);
          if (!channel?.isTextBased?.()) return ctx.invalidUsage(`Example: \`${ctx.prefix}welcome channel #welcome\` or \`${ctx.prefix}welcome channel here\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.channelId = channel.id; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome channel', `Welcome channel set to ${channel}.`)] });
        }

        if (['mode', 'style', 'embed'].includes(action)) {
          const raw = String(ctx.args[1] || '').toLowerCase();
          const mode = action === 'embed'
            ? (['on', 'embed', 'true', 'yes'].includes(raw) ? 'embed' : ['off', 'plain', 'false', 'no'].includes(raw) ? 'plain' : '')
            : raw;
          if (!['embed', 'plain'].includes(mode)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome mode embed\`, \`${ctx.prefix}welcome mode plain\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.mode = mode; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome mode', `Welcome messages now use **${getAnnouncementModeLabel(mode)}**.`)] });
        }

        if (action === 'title') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome title 👋 Bienvenue\`, \`${ctx.prefix}welcome title off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.welcome.title : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.title = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome title', next ? `Welcome title set to **${next}**.` : 'Welcome title cleared.')] });
        }

        if (action === 'message') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Example: \`${ctx.prefix}welcome message Bienvenue {user} sur {server}\`.`);
          const next = isDefaultWord(value) ? DEFAULT_GUILD.welcome.message : value;
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.message = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome message', 'Welcome message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{memberCount}`')] });
        }

        if (action === 'footer') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome footer Profite bien du serveur\`, \`${ctx.prefix}welcome footer off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.welcome.footer : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.footer = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome footer', next ? `Welcome footer set to **${next}**.` : 'Welcome footer cleared.')] });
        }

        if (action === 'image') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome image https://...\`, \`${ctx.prefix}welcome image off\`.`);
          const next = isOffWord(value) || isDefaultWord(value) ? null : value;
          if (next && !isValidHttpUrl(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}welcome image https://...\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.imageUrl = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome image', next ? 'Welcome image updated.' : 'Welcome image cleared.')] });
        }

        if (action === 'color') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome color #00D26A\`, \`${ctx.prefix}welcome color default\`.`);
          const next = isDefaultWord(value) || isOffWord(value) ? null : value;
          if (next && !isValidHexColorInput(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}welcome color #00D26A\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.welcome.color = next ? ensureHexColor(next) : null; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Welcome color', next ? `Welcome color set to **${ensureHexColor(next)}**.` : 'Welcome color now uses the default embed color.')] });
        }

        if (action === 'test' || action === 'preview') {
          const member = await ctx.getMember('target', 1) || ctx.member;
          const vars = getTextTemplateVars(ctx.guild, member);
          return ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.welcome, vars, { fallbackTitle: '👋 Welcome' }));
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}welcome mode plain\`, \`${ctx.prefix}welcome footer off\`, \`${ctx.prefix}welcome color #00D26A\`, \`${ctx.prefix}welcome test\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'leave',
      aliases: ['leavehub', 'goodbyehub', 'leavestyle'],
      category: 'Welcome',
      description: 'Advanced leave module hub with embed/plain controls and DM styling',
      usage: 'leave [view|on|off|channel <here|#channel>|mode <embed|plain>|title <text|off>|message <text>|footer <text|off>|image <url|off>|color <hex|default>|dm on|off|dmmode <embed|plain>|dmtitle <text|off>|dmmessage <text>|dmfooter <text|off>|dmimage <url|off>|dmcolor <hex|default>|vars|example|reset|test|testdm [@member]]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();

        if (['view', 'config', 'show', 'list', 'help', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildLeaveModuleEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['vars', 'variables'].includes(action)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'vars')] });
        if (['example', 'examples'].includes(action)) return ctx.reply({ embeds: [buildTextExamplesEmbed(ctx.guildConfig, 'leave', ctx.prefix)] });

        if (action === 'reset') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave = JSON.parse(JSON.stringify(DEFAULT_GUILD.leave)); return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave reset', 'Leave module reset to default settings.')] });
        }

        if (action === 'on' || action === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.enabled = action === 'on'; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave', `Leave messages are now **${action}**.`)] });
        }

        if (action === 'channel') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          let channel = null;
          if (rawDestination === 'here' && ctx.channel?.isTextBased?.()) channel = ctx.channel;
          if (!channel) channel = await ctx.getChannel('channel', 1);
          if (!channel?.isTextBased?.()) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave channel #logs\` or \`${ctx.prefix}leave channel here\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.channelId = channel.id; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave channel', `Leave channel set to ${channel}.`)] });
        }

        if (['mode', 'style', 'embed'].includes(action)) {
          const raw = String(ctx.args[1] || '').toLowerCase();
          const mode = action === 'embed'
            ? (['on', 'embed', 'true', 'yes'].includes(raw) ? 'embed' : ['off', 'plain', 'false', 'no'].includes(raw) ? 'plain' : '')
            : raw;
          if (!['embed', 'plain'].includes(mode)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave mode embed\`, \`${ctx.prefix}leave mode plain\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.mode = mode; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave mode', `Leave messages now use **${getAnnouncementModeLabel(mode)}**.`)] });
        }

        if (action === 'title') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave title 👋 Un membre est parti\`, \`${ctx.prefix}leave title off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.leave.title : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.title = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave title', next ? `Leave title set to **${next}**.` : 'Leave title cleared.')] });
        }

        if (action === 'message') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave message {userTag} a quitté {server}\`.`);
          const next = isDefaultWord(value) ? DEFAULT_GUILD.leave.message : value;
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.message = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave message', 'Leave message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{memberCount}`')] });
        }

        if (action === 'footer') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave footer Bonne continuation\`, \`${ctx.prefix}leave footer off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.leave.footer : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.footer = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave footer', next ? `Leave footer set to **${next}**.` : 'Leave footer cleared.')] });
        }

        if (action === 'image') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave image https://...\`, \`${ctx.prefix}leave image off\`.`);
          const next = isOffWord(value) || isDefaultWord(value) ? null : value;
          if (next && !isValidHttpUrl(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave image https://...\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.imageUrl = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave image', next ? 'Leave image updated.' : 'Leave image cleared.')] });
        }

        if (action === 'color') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave color #F87171\`, \`${ctx.prefix}leave color default\`.`);
          const next = isDefaultWord(value) || isOffWord(value) ? null : value;
          if (next && !isValidHexColorInput(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave color #F87171\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.color = next ? ensureHexColor(next) : null; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave color', next ? `Leave color set to **${ensureHexColor(next)}**.` : 'Leave color now uses the default embed color.')] });
        }

        if (action === 'dm') {
          const state = String(ctx.args[1] || '').toLowerCase();
          if (!['on', 'off'].includes(state)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave dm on\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmEnabled = state === 'on'; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM', `Leave DM is now **${state}**.`)] });
        }

        if (['dmmode', 'dmstyle', 'dmembed'].includes(action)) {
          const raw = String(ctx.args[1] || '').toLowerCase();
          const mode = action === 'dmembed'
            ? (['on', 'embed', 'true', 'yes'].includes(raw) ? 'embed' : ['off', 'plain', 'false', 'no'].includes(raw) ? 'plain' : '')
            : raw;
          if (!['embed', 'plain'].includes(mode)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave dmmode embed\`, \`${ctx.prefix}leave dmmode plain\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmMode = mode; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM mode', `Leave DMs now use **${getAnnouncementModeLabel(mode)}**.`)] });
        }

        if (action === 'dmtitle') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave dmtitle 👋 Tu as quitté {server}\`, \`${ctx.prefix}leave dmtitle off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.leave.dmTitle : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmTitle = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM title', next ? `Leave DM title set to **${next}**.` : 'Leave DM title cleared.')] });
        }

        if (action === 'dmmessage') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave dmmessage Tu as quitté **{server}**.\`.`);
          const next = isDefaultWord(value) ? DEFAULT_GUILD.leave.dmMessage : value;
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmMessage = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM message', 'Leave DM message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{memberCount}`')] });
        }

        if (action === 'dmfooter') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave dmfooter À bientôt\`, \`${ctx.prefix}leave dmfooter off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.leave.dmFooter : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmFooter = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM footer', next ? `Leave DM footer set to **${next}**.` : 'Leave DM footer cleared.')] });
        }

        if (action === 'dmimage') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave dmimage https://...\`, \`${ctx.prefix}leave dmimage off\`.`);
          const next = isOffWord(value) || isDefaultWord(value) ? null : value;
          if (next && !isValidHttpUrl(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave dmimage https://...\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmImageUrl = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM image', next ? 'Leave DM image updated.' : 'Leave DM image cleared.')] });
        }

        if (action === 'dmcolor') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave dmcolor #F87171\`, \`${ctx.prefix}leave dmcolor default\`.`);
          const next = isDefaultWord(value) || isOffWord(value) ? null : value;
          if (next && !isValidHexColorInput(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leave dmcolor #F87171\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmColor = next ? ensureHexColor(next) : null; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM color', next ? `Leave DM color set to **${ensureHexColor(next)}**.` : 'Leave DM color now uses the default embed color.')] });
        }

        if (action === 'test' || action === 'preview') {
          const member = await ctx.getMember('target', 1) || ctx.member;
          const vars = getTextTemplateVars(ctx.guild, member);
          return ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.leave, vars, { fallbackTitle: '👋 Member left' }));
        }

        if (action === 'testdm') {
          const member = await ctx.getMember('target', 1) || ctx.member;
          const vars = getTextTemplateVars(ctx.guild, member);
          const payload = createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.leave, vars, {
            modeKey: 'dmMode',
            titleKey: 'dmTitle',
            messageKey: 'dmMessage',
            footerKey: 'dmFooter',
            colorKey: 'dmColor',
            imageKey: 'dmImageUrl',
            fallbackTitle: '👋 You left {server}'
          });
          const sent = await member.send(payload).catch(() => null);
          if (!sent) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM test', `I could not DM ${member}. Their DMs may be closed.`)] });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM test', `Leave DM sent to ${member}.`)] });
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}leave mode plain\`, \`${ctx.prefix}leave dmmode plain\`, \`${ctx.prefix}leave dmfooter off\`, \`${ctx.prefix}leave testdm\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'boost',
      aliases: ['boosthub', 'boostsetup', 'booststyle'],
      category: 'Logs',
      description: 'Advanced boost module hub with embed/plain style controls',
      usage: 'boost [view|on|off|channel <here|#channel>|mode <embed|plain>|title <text|off>|message <text>|footer <text|off>|image <url|off>|color <hex|default>|vars|example|reset|test [@member]]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const action = String(ctx.args[0] || 'view').toLowerCase();

        if (['view', 'config', 'show', 'list', 'help', 'status', 'setup'].includes(action)) return ctx.reply({ embeds: [buildBoostModuleEmbed(ctx.guildConfig, ctx.prefix)] });
        if (['vars', 'variables'].includes(action)) return ctx.reply({ embeds: [buildTextsHubEmbed(ctx.guildConfig, ctx.prefix, 'vars')] });
        if (['example', 'examples'].includes(action)) return ctx.reply({ embeds: [buildTextExamplesEmbed(ctx.guildConfig, 'boost', ctx.prefix)] });

        if (action === 'reset') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost = JSON.parse(JSON.stringify(DEFAULT_GUILD.boost)); return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost reset', 'Boost module reset to default settings.')] });
        }

        if (action === 'on' || action === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.enabled = action === 'on'; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost', `Boost announcements are now **${action}**.`)] });
        }

        if (action === 'channel') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          let channel = null;
          if (rawDestination === 'here' && ctx.channel?.isTextBased?.()) channel = ctx.channel;
          if (!channel) channel = await ctx.getChannel('channel', 1);
          if (!channel?.isTextBased?.()) return ctx.invalidUsage(`Example: \`${ctx.prefix}boost channel #boosts\` or \`${ctx.prefix}boost channel here\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.channelId = channel.id; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost channel', `Boost channel set to ${channel}.`)] });
        }

        if (['mode', 'style', 'embed'].includes(action)) {
          const raw = String(ctx.args[1] || '').toLowerCase();
          const mode = action === 'embed'
            ? (['on', 'embed', 'true', 'yes'].includes(raw) ? 'embed' : ['off', 'plain', 'false', 'no'].includes(raw) ? 'plain' : '')
            : raw;
          if (!['embed', 'plain'].includes(mode)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost mode embed\`, \`${ctx.prefix}boost mode plain\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.mode = mode; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost mode', `Boost announcements now use **${getAnnouncementModeLabel(mode)}**.`)] });
        }

        if (action === 'title') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost title 🚀 Nouveau boost\`, \`${ctx.prefix}boost title off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.boost.title : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.title = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost title', next ? `Boost title set to **${next}**.` : 'Boost title cleared.')] });
        }

        if (action === 'message') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Example: \`${ctx.prefix}boost message {user} a boost le serveur\`.`);
          const next = isDefaultWord(value) ? DEFAULT_GUILD.boost.message : value;
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.message = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost message', 'Boost message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{boostCount}`, `{boostTier}`')] });
        }

        if (action === 'footer') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost footer Merci pour le soutien\`, \`${ctx.prefix}boost footer off\`.`);
          const next = isOffWord(value) ? null : (isDefaultWord(value) ? DEFAULT_GUILD.boost.footer : value);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.footer = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost footer', next ? `Boost footer set to **${next}**.` : 'Boost footer cleared.')] });
        }

        if (action === 'image') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost image https://...\`, \`${ctx.prefix}boost image off\`.`);
          const next = isOffWord(value) || isDefaultWord(value) ? null : value;
          if (next && !isValidHttpUrl(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}boost image https://...\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.imageUrl = next; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost image', next ? 'Boost image updated.' : 'Boost image cleared.')] });
        }

        if (action === 'color') {
          const value = (ctx.getRest(1) || '').trim();
          if (!value) return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost color #FF73FA\`, \`${ctx.prefix}boost color default\`.`);
          const next = isDefaultWord(value) || isOffWord(value) ? null : value;
          if (next && !isValidHexColorInput(next)) return ctx.invalidUsage(`Example: \`${ctx.prefix}boost color #FF73FA\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.boost.color = next ? ensureHexColor(next) : null; return guild; });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚀 Boost color', next ? `Boost color set to **${ensureHexColor(next)}**.` : 'Boost color now uses the default embed color.')] });
        }

        if (action === 'test' || action === 'preview') {
          const member = await ctx.getMember('target', 1) || ctx.member;
          const vars = getTextTemplateVars(ctx.guild, member);
          return ctx.reply(createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.boost, vars, { fallbackTitle: '🚀 New boost' }));
        }

        return ctx.invalidUsage(`Examples: \`${ctx.prefix}boost mode plain\`, \`${ctx.prefix}boost footer off\`, \`${ctx.prefix}boost color #FF73FA\`, \`${ctx.prefix}boost test\`.`);
      }
    }),

    makeSimpleCommand({
      name: 'leavedm',
      aliases: ['leftdm', 'goodbyedm'],
      category: 'Welcome',
      description: 'Toggle leave DMs quickly',
      usage: 'leavedm on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const state = String(ctx.args[0] || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage(`Example: \`${ctx.prefix}leavedm on\`.`);
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmEnabled = state === 'on'; return guild; });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM', `Leave DM is now **${state}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'setleavedm',
      aliases: ['leavedmmessage', 'goodbyedmmessage'],
      category: 'Welcome',
      description: 'Set the leave DM message template',
      usage: 'setleavedm <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const value = (ctx.getRest(0) || '').trim();
        if (!value) return ctx.invalidUsage(`Example: \`${ctx.prefix}setleavedm Tu as quitté **{server}**.\`.`);
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.leave.dmMessage = value; return guild; });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM message', 'Leave DM message updated. Variables: `{user}`, `{userTag}`, `{server}`, `{memberCount}`')] });
      }
    }),

    makeSimpleCommand({
      name: 'testleavedm',
      aliases: ['previewleavedm'],
      category: 'Welcome',
      description: 'Send the leave DM to a member for testing',
      usage: 'testleavedm [@member]',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      async execute(ctx) {
        const member = await ctx.getMember('target', 0) || ctx.member;
        const vars = getTextTemplateVars(ctx.guild, member);
        const payload = createModulePreviewMessage(ctx.guildConfig, ctx.guildConfig.leave, vars, {
          modeKey: 'dmMode',
          titleKey: 'dmTitle',
          messageKey: 'dmMessage',
          footerKey: 'dmFooter',
          colorKey: 'dmColor',
          imageKey: 'dmImageUrl',
          fallbackTitle: '👋 You left {server}'
        });
        const delivered = await member.send(payload).catch(() => null);
        if (!delivered) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM test', `I could not DM ${member}. Their DMs may be closed.`)] });
        return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👋 Leave DM test', `Leave DM sent to ${member}.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'supporttoggle',
      aliases: ['supporton', 'supportoff'],
      category: 'Support',
      description: 'Toggle the support DM relay',
      usage: 'supporttoggle on|off',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'support', sub: 'supporttoggle', description: 'Toggle the support DM relay', options: [{ type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const state = (ctx.getText('state', 0) || '').toLowerCase();
        if (!['on', 'off'].includes(state)) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.support.enabled = state === 'on'; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support relay', `Support relay is now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setsupportchannel',
      aliases: ['supportchannel'],
      category: 'Support',
      description: 'Set the staff support relay channel',
      usage: 'setsupportchannel <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'support', sub: 'setsupportchannel', description: 'Set the staff support relay channel', options: [{ type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0);
        if (!channel) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.support.channelId = channel.id; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support channel', `Support relay channel set to ${channel}.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'setsupportrole',
      aliases: ['supportrole'],
      category: 'Support',
      description: 'Set the staff role pinged on new support DMs',
      usage: 'setsupportrole <@role>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'support', sub: 'setsupportrole', description: 'Set the staff role pinged on new support DMs', options: [{ type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const role = await ctx.getRole('role', 0);
        if (!role) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => { guild.support.pingRoleId = role.id; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support role', `${role} will be pinged for new support DMs.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'support',
      aliases: ['helpme', 'mp', 'supporthelp'],
      category: 'Support',
      description: 'Support hub for config, panel editing and member DMs',
      usage: 'support [view|panel|on|off|relay <here|#channel|off>|entry <here|#channel|off>|role <@role|off>|restrict <on|off>|text [config|send]|test|member|status]',
      dmAllowed: true,
      slash: { root: 'support', sub: 'support', description: 'Open support via DMs', options: [{ type: 'string', name: 'message', description: 'Optional first message', required: false }] },
      async execute(ctx) {
        const sub = String(ctx.args[0] || '').toLowerCase();
        const support = ctx.guildConfig.support || {};

        if (!ctx.guild) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support', 'You are already in DMs. Just send your message and staff will see it if support relay is configured.')] });
        }

        const panelAliases = ['panel', 'menu', 'buttons'];
        if (panelAliases.includes(sub)) {
          return ctx.reply({
            embeds: [createSupportPanelEmbed(ctx.guildConfig, ctx.guild, ctx.prefix, ctx.channel)],
            components: createSupportPanelComponents()
          });
        }

        if (['view', 'config', 'show', 'list', 'status', 'setup'].includes(sub)) {
          return ctx.reply({ embeds: [buildSupportModuleEmbed(ctx.guildConfig, ctx.prefix)] });
        }

        if (sub === 'member') {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support • Member flow', [
            `1. member runs \`${ctx.prefix}support mon message\``,
            `2. bot opens/uses DM with the member`,
            `3. bot forwards the message to the relay channel`,
            `4. staff answer with \`${ctx.prefix}reply\` or by replying to a forwarded support message`
          ].join('\n'))] });
        }

        const textSub = String(ctx.args[1] || '').toLowerCase();
        const manageRequested = ['on', 'off', 'channel', 'relay', 'entry', 'role', 'restrict', 'test', 'text'].includes(sub);
        const canManage = ctx.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
        if (manageRequested && !canManage) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support', 'You need the **Manage Server** permission for support setup actions.')] });
        }

        if (sub === 'on' || sub === 'off') {
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
            guild.support.enabled = sub === 'on';
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support relay', `Support relay is now **${sub}**.`)] });
        }

        if (sub === 'relay' || sub === 'channel') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          const clear = ['off', 'none', 'remove', 'clear'].includes(rawDestination);
          let channel = null;
          if (!clear) {
            if (rawDestination === 'here') channel = ctx.channel;
            else channel = await ctx.getChannel('channel', 1);
            if (!channel?.isTextBased?.()) return ctx.invalidUsage(`Examples: \`${ctx.prefix}support relay here\`, \`${ctx.prefix}support relay #support-logs\`, \`${ctx.prefix}support relay off\`.`);
          }
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
            guild.support.channelId = clear ? null : channel.id;
            if (!clear) guild.support.enabled = true;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support relay', clear ? 'Support relay channel cleared.' : `Support relay channel set to ${channel}.`)] });
        }

        if (sub === 'entry') {
          const rawDestination = String(ctx.args[1] || '').toLowerCase();
          const clear = ['off', 'none', 'remove', 'clear'].includes(rawDestination);
          let channel = null;
          if (!clear) {
            if (rawDestination === 'here') channel = ctx.channel;
            else channel = await ctx.getChannel('channel', 1);
            if (!channel?.isTextBased?.()) return ctx.invalidUsage(`Examples: \`${ctx.prefix}support entry here\`, \`${ctx.prefix}support entry #support\`, \`${ctx.prefix}support entry off\`.`);
          }
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
            guild.support.entryChannelId = clear ? null : channel.id;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support member channel', clear ? 'Support member channel cleared.' : `Members should use ${channel} for \`${ctx.prefix}support\`.`)] });
        }

        if (sub === 'restrict') {
          const state = String(ctx.args[1] || '').toLowerCase();
          if (!['on', 'off'].includes(state)) return ctx.invalidUsage(`Examples: \`${ctx.prefix}support restrict on\`, \`${ctx.prefix}support restrict off\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
            guild.support.restrictToEntry = state === 'on';
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support restriction', state === 'on' ? `Members must now use \`${ctx.prefix}support\` in ${support.entryChannelId ? `<#${support.entryChannelId}>` : 'the configured support channel'}.` : 'Members can now use support from any channel again.')] });
        }

        if (sub === 'role') {
          const rawRole = String(ctx.args[1] || '').toLowerCase();
          const clear = ['off', 'none', 'remove', 'clear'].includes(rawRole);
          const role = clear ? null : await ctx.getRole('role', 1);
          if (!clear && !role) return ctx.invalidUsage(`Examples: \`${ctx.prefix}support role @Staff\`, \`${ctx.prefix}support role off\`.`);
          ctx.store.updateGuild(ctx.guild.id, (guild) => {
            guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
            guild.support.pingRoleId = clear ? null : role.id;
            return guild;
          });
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support role', clear ? 'Support ping role cleared.' : `${role} will be pinged for new support DMs.`)] });
        }

        if (sub === 'text') {
          if (!textSub || ['config', 'panel', 'buttons', 'edit'].includes(textSub)) {
            return ctx.reply({
              embeds: [createSupportPanelEmbed(ctx.guildConfig, ctx.guild, ctx.prefix, ctx.channel)],
              components: createSupportPanelComponents()
            });
          }
          if (textSub === 'send') {
            const targetChannelId = ctx.guildConfig.support?.entryChannelId || ctx.channel?.id;
            const targetChannel = await ctx.guild.channels.fetch(targetChannelId).catch(() => null);
            if (!targetChannel?.isTextBased?.()) {
              return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support prompt', `Set a member channel first with \`${ctx.prefix}support entry #support\`, or run this command in the channel where the prompt should be sent.`)] });
            }
            const payload = createSupportPromptPayload(ctx.guildConfig, ctx.guild, ctx.prefix, targetChannel);
            const sent = await targetChannel.send(payload).catch(() => null);
            return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support prompt', sent ? `Support prompt sent in ${targetChannel}.` : 'I could not send the support prompt.')] });
          }
          return ctx.invalidUsage(`Examples: \`${ctx.prefix}support text config\`, \`${ctx.prefix}support text send\`.`);
        }

        if (sub === 'check') return ctx.reply({ embeds: [buildSupportModuleEmbed(ctx.guildConfig, ctx.prefix)] });

        if (sub === 'test') {
          if (!support.channelId) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support test', `No relay channel is set yet. Use \`${ctx.prefix}support relay #support-logs\`.`)] });
          const relayChannel = await ctx.guild.channels.fetch(support.channelId).catch(() => null);
          if (!relayChannel?.isTextBased?.()) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support test', 'The configured relay channel no longer exists or is not text-based.')] });
          const sent = await relayChannel.send({
            content: support.pingRoleId ? `<@&${support.pingRoleId}>` : null,
            embeds: [baseEmbed(ctx.guildConfig, '🧪 Support relay test', [
              `This is a test message for the support relay.`,
              `Staff replies should use \`${ctx.prefix}reply @user <text>\` or reply directly to a forwarded support message.`
            ].join('\n'))]
          }).catch(() => null);
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support test', sent ? `Test sent in ${relayChannel}.` : 'I could not send the support test message.')] });
        }

        if (support.restrictToEntry && support.entryChannelId && ctx.channel?.id !== support.entryChannelId && !canManage) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support', `Use \`${ctx.prefix}support\` in <#${support.entryChannelId}>.`)] });
        }

        const textValue = ctx.interaction ? ctx.interaction.options.getString('message') : ctx.getRest(0);
        const files = getCommandFiles(ctx);
        const imageUrl = getCommandImageUrl(ctx);
        if (!ctx.guildConfig.support.enabled || !ctx.guildConfig.support.channelId) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support not configured', `A manager must run \`${ctx.prefix}support on\` and \`${ctx.prefix}support relay #channel\` first.`)] });
        }
        if (ctx.message) await ctx.message.delete().catch(() => null);
        ctx.store.updateGlobal((global) => {
          global.supportRoutes[ctx.user.id] = ctx.guild.id;
          return global;
        });

        const dm = await ctx.user.createDM().catch(() => null);
        if (!dm) return ctx.channel.send({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support', 'I could not DM you. Please enable DMs and try again.')] }).catch(() => null);

        await dm.send({ embeds: [baseEmbed(ctx.guildConfig, '📨 DvL Support', `Support is linked to **${ctx.guild.name}**.
Send your message here and staff replies will come back here.`)] }).catch(() => null);

        if (textValue || files.length) {
          const relayChannel = await ctx.guild.channels.fetch(ctx.guildConfig.support.channelId).catch(() => null);
          if (relayChannel?.isTextBased?.()) {
            const relayEmbed = baseEmbed(ctx.guildConfig, `📨 Support DM • ${ctx.user.tag}`, textValue || 'Initial support message with attachment(s).')
              .addFields(
                { name: 'User', value: `${ctx.user} • ${ctx.user.tag}`, inline: false },
                { name: 'User ID', value: ctx.user.id, inline: true },
                { name: 'Guild', value: ctx.guild.name, inline: true },
                { name: 'Started from', value: support.entryChannelId ? `<#${support.entryChannelId}>` : (ctx.channel ? `${ctx.channel}` : 'unknown'), inline: false }
              )
              .setThumbnail(ctx.user.displayAvatarURL());
            if (imageUrl) relayEmbed.setImage(imageUrl);
            const forwarded = await relayChannel.send({
              content: ctx.guildConfig.support.pingRoleId ? `<@&${ctx.guildConfig.support.pingRoleId}>` : null,
              embeds: [relayEmbed],
              files
            }).catch(() => null);
            if (forwarded) {
              ctx.client.supportMessageLinks.set(forwarded.id, { userId: ctx.user.id, guildId: ctx.guild.id });
              ctx.store.updateGlobal((global) => {
                global.supportLinks = Object.fromEntries(ctx.client.supportMessageLinks.entries());
                return global;
              });
            }
          }
        }

        await ctx.channel.send({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support', `${ctx.user}, check your DMs.`)] }).then((msg) => setTimeout(() => msg.delete().catch(() => null), 10_000).unref?.()).catch(() => null);
      }
    }),
    makeSimpleCommand({
      name: 'reply',
      aliases: ['supportreply', 'sreply', 'dmreply'],
      category: 'Support',
      description: 'Reply to a support user from the staff channel',
      usage: 'reply <@user|id> <text>  or reply to a forwarded message with +reply <text>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      slash: { root: 'support', sub: 'reply', description: 'Reply to a support user', options: [{ type: 'user', name: 'user', description: 'Target user', required: false }, { type: 'string', name: 'text', description: 'Reply text', required: true }] },
      async execute(ctx) {
        let user = ctx.interaction ? ctx.interaction.options.getUser('user') : null;
        let text = ctx.interaction ? ctx.interaction.options.getString('text') : null;

        if (!ctx.interaction) {
          const firstArg = ctx.args[0] || null;
          user = await resolveSupportTargetUser(ctx, firstArg);
          const consumedTarget = user && !ctx.message?.reference?.messageId ? 1 : 0;
          text = String((consumedTarget ? ctx.getRest(1) : ctx.getRest(0)) || '').trim();
        }

        const files = getCommandFiles(ctx);
        const imageUrl = getCommandImageUrl(ctx);
        if (!user || (!text && !files.length)) return ctx.invalidUsage('You can also attach an image or file to your reply.');

        const description = text || 'Staff sent you an attachment.';
        const embed = baseEmbed(ctx.guildConfig, `💬 Staff reply • ${ctx.guild.name}`, description)
          .setFooter({ text: `From ${ctx.guild.name}` });
        if (imageUrl) embed.setImage(imageUrl);

        const delivered = await user.send({
          embeds: [embed],
          files,
          allowedMentions: { parse: [] }
        }).catch(() => null);
        if (!delivered) {
          return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support reply', `I could not DM **${user.tag}**. Their DMs are probably closed.`)] });
        }
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📨 Support reply', `Reply sent to **${user.tag}**.${files.length ? `
Attachments: **${files.length}**` : ''}`)] });
      }
    }),

    makeSimpleCommand({
      name: 'invites',
      aliases: ['invitecount'],
      category: 'Tracking',
      description: 'Show invite count for a member',
      usage: 'invites [@member]',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'invites', description: 'Show invite count for a member', options: [{ type: 'user', name: 'target', description: 'Target member', required: false }] },
      async execute(ctx) {
        const user = ctx.interaction ? (ctx.interaction.options.getUser('target') || ctx.user) : (ctx.message?.mentions.users.first() || ctx.user);
        const count = ctx.guildConfig.invites.stats[user.id]?.count || 0;
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '📈 Invites', `${user} has **${count}** invite(s).`)] });
      }
    }),
    makeSimpleCommand({
      name: 'inviteleaderboard',
      aliases: ['topinvites', 'invlb'],
      category: 'Tracking',
      description: 'Show the invite leaderboard',
      usage: 'inviteleaderboard',
      guildOnly: true,
      slash: { root: 'tracking', sub: 'inviteleaderboard', description: 'Show the invite leaderboard' },
      async execute(ctx) {
        const entries = Object.entries(ctx.guildConfig.invites.stats || {})
          .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
          .slice(0, 10);
        const desc = entries.length ? entries.map(([id, data], index) => `**#${index + 1}** <@${id}> — **${data.count || 0}**`).join('\n') : 'No invite data yet.';
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🏆 Invite Leaderboard', desc)] });
      }
    }),

    makeSimpleCommand({
      name: 'gstart',
      aliases: ['giveawaystart', 'gcreate'],
      category: 'Giveaway',
      description: 'Start a giveaway',
      usage: 'gstart <time> <winners> <prize>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gstart', description: 'Start a giveaway', options: [{ type: 'string', name: 'time', description: 'Example: 10m', required: true }, { type: 'integer', name: 'winners', description: 'Winner count', required: true, minValue: 1, maxValue: 20 }, { type: 'string', name: 'prize', description: 'Prize', required: true }] },
      async execute(ctx) {
        const timeRaw = ctx.getText('time', 0);
        const winners = Number(ctx.getText('winners', 1));
        const prize = ctx.interaction ? ctx.interaction.options.getString('prize') : ctx.args.slice(2).join(' ');
        const duration = parseDuration(timeRaw);
        if (!duration || !winners || !prize) return ctx.invalidUsage('Example: `+gstart 10m 1 Nitro`');
        const id = crypto.randomBytes(4).toString('hex');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveaway:join:${id}`).setLabel('🎉 Join').setStyle(ButtonStyle.Success)
        );
        const embed = baseEmbed(ctx.guildConfig, '🎁 Giveaway', `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor((Date.now() + duration) / 1000)}:R>\n**Hosted by:** ${ctx.user}`)
          .setFooter({ text: `ID: ${id}` });
        const sent = await ctx.reply({ embeds: [embed], components: [row] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.giveaways[id] = {
            id,
            messageId: sent.id,
            messageUrl: sent.url,
            channelId: sent.channel.id,
            prize,
            winners,
            participants: [],
            createdAt: Date.now(),
            endsAt: Date.now() + duration,
            ended: false,
            paused: false,
            pauseRemaining: null,
            hostId: ctx.user.id
          };
          return guild;
        });
      }
    }),
    makeSimpleCommand({
      name: 'gend',
      aliases: ['giveawayend'],
      category: 'Giveaway',
      description: 'Force end a giveaway',
      usage: 'gend <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gend', description: 'Force end a giveaway', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}gend latest\`.`)] });
        if (target.giveaway.ended) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway', `Giveaway **${target.id}** is already ended.`)] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          if (guild.giveaways[target.id]) {
            guild.giveaways[target.id].endsAt = Date.now() - 1000;
            guild.giveaways[target.id].paused = false;
            guild.giveaways[target.id].pauseRemaining = null;
          }
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway ending', `Giveaway **${target.id}** (${target.giveaway.prize}) will end on the next check.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'greroll',
      aliases: ['giveawayreroll'],
      category: 'Giveaway',
      description: 'Reroll a giveaway winner',
      usage: 'greroll <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'greroll', description: 'Reroll a giveaway winner', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎉 Giveaway reroll', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}greroll latest\`.`)] });
        if (!target.giveaway.ended) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎉 Giveaway reroll', `Giveaway **${target.id}** is not finished yet. Use \`${ctx.prefix}gend ${target.id}\` first if you want to end it now.`)] });
        const pool = [...new Set(target.giveaway.participants || [])];
        const winners = pool.sort(() => Math.random() - 0.5).slice(0, target.giveaway.winners || 1);
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          if (guild.giveaways[target.id]) guild.giveaways[target.id].lastWinnerIds = winners;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎉 Giveaway reroll', winners.length ? `New winner(s) for **${target.giveaway.prize}**: ${winners.map((winnerId) => `<@${winnerId}>`).join(', ')}` : 'No participants to reroll.')] });
      }
    }),
    makeSimpleCommand({
      name: 'gpause',
      aliases: ['giveawaypause'],
      category: 'Giveaway',
      description: 'Pause a giveaway',
      usage: 'gpause <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gpause', description: 'Pause a giveaway', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏸️ Giveaway paused', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}gpause latest\`.`)] });
        if (target.giveaway.ended) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏸️ Giveaway paused', `Giveaway **${target.id}** is already ended.`)] });
        if (target.giveaway.paused) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏸️ Giveaway paused', `Giveaway **${target.id}** is already paused.`)] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const g = guild.giveaways[target.id];
          if (g) {
            g.pauseRemaining = Math.max(0, g.endsAt - Date.now());
            g.paused = true;
          }
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '⏸️ Giveaway paused', `Giveaway **${target.id}** (${target.giveaway.prize}) paused.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'gresume',
      aliases: ['giveawayresume'],
      category: 'Giveaway',
      description: 'Resume a paused giveaway',
      usage: 'gresume <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gresume', description: 'Resume a paused giveaway', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '▶️ Giveaway resumed', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}gresume latest\`.`)] });
        if (target.giveaway.ended) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '▶️ Giveaway resumed', `Giveaway **${target.id}** is already ended, so it cannot be resumed.`)] });
        if (!target.giveaway.paused) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '▶️ Giveaway resumed', `Giveaway **${target.id}** is not paused. Use \`${ctx.prefix}ginfo ${target.id}\` to inspect it or \`${ctx.prefix}gpause ${target.id}\` first.`)] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const g = guild.giveaways[target.id];
          if (g) {
            g.endsAt = Date.now() + (g.pauseRemaining || 0);
            g.pauseRemaining = null;
            g.paused = false;
          }
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '▶️ Giveaway resumed', `Giveaway **${target.id}** (${target.giveaway.prize}) resumed.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'gedit',
      aliases: ['giveawayedit'],
      category: 'Giveaway',
      description: 'Edit the giveaway prize',
      usage: 'gedit <id|message|link|latest> <new prize>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gedit', description: 'Edit the giveaway prize', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }, { type: 'string', name: 'prize', description: 'New prize', required: true }] },
      async execute(ctx) {
        const raw = ctx.getText('id', 0);
        const target = await resolveGiveawayEntry(ctx, raw);
        const prize = ctx.interaction ? ctx.interaction.options.getString('prize') : (target.giveaway && raw ? ctx.args.slice(1).join(' ') : ctx.args.join(' '));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✏️ Giveaway edited', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}gedit latest Nitro\`.`)] });
        if (!prize) return ctx.invalidUsage(`Example: \`${ctx.prefix}gedit ${target.id} Nitro Basic\``);
        ctx.store.updateGuild(ctx.guild.id, (guild) => { if (guild.giveaways[target.id]) guild.giveaways[target.id].prize = prize; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '✏️ Giveaway edited', `Giveaway **${target.id}** prize updated to **${prize}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'gdelete',
      aliases: ['giveawaydelete'],
      category: 'Giveaway',
      description: 'Delete a giveaway from storage',
      usage: 'gdelete <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gdelete', description: 'Delete a giveaway from storage', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: true }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0));
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🗑️ Giveaway deleted', `I could not find that giveaway. Try the giveaway ID, message link, message ID, or \`${ctx.prefix}gdelete latest\`.`)] });
        ctx.store.updateGuild(ctx.guild.id, (guild) => { delete guild.giveaways[target.id]; return guild; });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🗑️ Giveaway deleted', `Giveaway **${target.id}** (${target.giveaway.prize}) was removed from storage.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'ginfo',
      aliases: ['giveawayinfo', 'gview'],
      category: 'Giveaway',
      description: 'Inspect one giveaway and see its state, IDs and last winners',
      usage: 'ginfo <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'ginfo', description: 'Inspect one giveaway', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: false }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0) || 'latest');
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway info', `No giveaway found. Try \`${ctx.prefix}glist\` first.`)] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, `🎁 Giveaway • ${target.giveaway.prize}`, buildGiveawayInfoLines(target.giveaway).join('\n'))] });
      }
    }),
    makeSimpleCommand({
      name: 'gparticipants',
      aliases: ['giveawayparticipants', 'gusers'],
      category: 'Giveaway',
      description: 'Show who joined a giveaway',
      usage: 'gparticipants <id|message|link|latest>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'gparticipants', description: 'Show who joined a giveaway', options: [{ type: 'string', name: 'id', description: 'Giveaway ID', required: false }] },
      async execute(ctx) {
        const target = await resolveGiveawayEntry(ctx, ctx.getText('id', 0) || 'latest');
        if (!target.giveaway) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎁 Giveaway participants', `No giveaway found. Try \`${ctx.prefix}glist\` first.`)] });
        const participants = [...new Set(target.giveaway.participants || [])];
        const lines = participants.length ? participants.slice(0, 50).map((userId, index) => `**${index + 1}.** <@${userId}> • \`${userId}\``) : ['Nobody joined this giveaway yet.'];
        if (participants.length > 50) lines.push(`
…and ${participants.length - 50} more.`);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, `🎁 Participants • ${target.giveaway.prize}`, [`**Giveaway:** \`${target.id}\``, `**Count:** ${participants.length}`, '', ...lines].join('\n').slice(0, 4000))] });
      }
    }),
    makeSimpleCommand({
      name: 'glist',
      aliases: ['giveawaylist'],
      category: 'Giveaway',
      description: 'List saved giveaways',
      usage: 'glist',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'giveaway', sub: 'glist', description: 'List saved giveaways' },
      async execute(ctx) {
        const entries = getSortedGiveaways(ctx.guildConfig.giveaways || {});
        await ctx.reply({ embeds: buildGiveawayListEmbeds(ctx, entries) });
      }
    }),

    makeSimpleCommand({
      name: 'tiktokadd',
      aliases: ['ttadd'],
      category: 'TikTok',
      description: 'Add a TikTok watcher',
      usage: 'tiktokadd <username> <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktokadd', description: 'Add a TikTok watcher', options: [{ type: 'string', name: 'username', description: 'Username without @', required: true }, { type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        const channel = await ctx.getChannel('channel', 1);
        if (!username || !channel) return ctx.invalidUsage();
        const status = await fetchTikTokStatus(username).catch(() => null);
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.tiktok.watchers.push({
            username,
            channelId: channel.id,
            announceVideos: true,
            announceLive: true,
            mentionRoleId: null,
            lastVideoId: status?.latestVideoId || null,
            wasLive: Boolean(status?.isLive),
            lastLiveRoomId: status?.liveRoomId || null,
            lastSource: status?.source || null,
            lastCheckAt: Date.now(),
            lastError: null
          });
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Added watcher for **@${username}** → ${channel}\nCurrent status: live **${status?.isLive ? 'yes' : 'no'}** • video **${status?.latestVideoId || 'none'}** • source **${status?.source || 'n/a'}**`)] });
      }
    }),
    makeSimpleCommand({
      name: 'tiktokremove',
      aliases: ['ttremove'],
      category: 'TikTok',
      description: 'Remove a TikTok watcher',
      usage: 'tiktokremove <username>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktokremove', description: 'Remove a TikTok watcher', options: [{ type: 'string', name: 'username', description: 'Username', required: true }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        if (!username) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.tiktok.watchers = guild.tiktok.watchers.filter((watcher) => watcher.username.toLowerCase() !== username.toLowerCase());
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Removed watcher for **@${username}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'tiktoklist',
      aliases: ['ttlist'],
      category: 'TikTok',
      description: 'List TikTok watchers',
      usage: 'tiktoklist',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoklist', description: 'List TikTok watchers' },
      async execute(ctx) {
        await ctx.reply({ embeds: buildTikTokWatcherEmbeds(ctx) });
      }
    }),
    makeSimpleCommand({
      name: 'tiktoksetrole',
      aliases: ['ttrole'],
      category: 'TikTok',
      description: 'Set a mention role for a watcher',
      usage: 'tiktoksetrole <username> <@role>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoksetrole', description: 'Set a mention role for a watcher', options: [{ type: 'string', name: 'username', description: 'Username', required: true }, { type: 'role', name: 'role', description: 'Role', required: true }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        const role = await ctx.getRole('role', 1);
        if (!username || !role) return ctx.invalidUsage();
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const watcher = guild.tiktok.watchers.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
          if (watcher) watcher.mentionRoleId = role.id;
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Mention role set for **@${username}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'tiktoksetchannel',
      aliases: ['ttchannel'],
      category: 'TikTok',
      description: 'Change the channel used by a TikTok watcher',
      usage: 'tiktoksetchannel <username> <#channel>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoksetchannel', description: 'Set the channel for a TikTok watcher', options: [{ type: 'string', name: 'username', description: 'Username', required: true }, { type: 'channel', name: 'channel', description: 'Channel', required: true, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        const channel = await ctx.getChannel('channel', 1);
        if (!username || !channel) return ctx.invalidUsage();
        let found = false;
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const watcher = guild.tiktok.watchers.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
          if (watcher) { watcher.channelId = channel.id; found = true; }
          return guild;
        });
        if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Channel updated for **@${username}** → ${channel}`)] });
      }
    }),
    makeSimpleCommand({
      name: 'tiktoktogglelive',
      aliases: ['ttlive'],
      category: 'TikTok',
      description: 'Toggle live announcements for a TikTok watcher',
      usage: 'tiktoktogglelive <username> <on|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoktogglelive', description: 'Toggle live announcements for a TikTok watcher', options: [{ type: 'string', name: 'username', description: 'Username', required: true }, { type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        const state = (ctx.getText('state', 1) || '').toLowerCase();
        if (!username || !['on', 'off'].includes(state)) return ctx.invalidUsage();
        let found = false;
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const watcher = guild.tiktok.watchers.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
          if (watcher) { watcher.announceLive = state === 'on'; found = true; }
          return guild;
        });
        if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Live announcements for **@${username}** are now **${state}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'tiktoktogglevideo',
      aliases: ['ttvideo'],
      category: 'TikTok',
      description: 'Toggle video announcements for a TikTok watcher',
      usage: 'tiktoktogglevideo <username> <on|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoktogglevideo', description: 'Toggle video announcements for a TikTok watcher', options: [{ type: 'string', name: 'username', description: 'Username', required: true }, { type: 'string', name: 'state', description: 'on/off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        const state = (ctx.getText('state', 1) || '').toLowerCase();
        if (!username || !['on', 'off'].includes(state)) return ctx.invalidUsage();
        let found = false;
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          const watcher = guild.tiktok.watchers.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
          if (watcher) { watcher.announceVideos = state === 'on'; found = true; }
          return guild;
        });
        if (!found) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', 'Watcher not found.')] });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok watcher', `Video announcements for **@${username}** are now **${state}**.`)] });
      }
    }),

    makeSimpleCommand({
      name: 'tiktoktest',
      aliases: ['tttest'],
      category: 'TikTok',
      description: 'Test a TikTok username',
      usage: 'tiktoktest <username>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktoktest', description: 'Test a TikTok username', options: [{ type: 'string', name: 'username', description: 'Username', required: true }] },
      async execute(ctx) {
        const username = (ctx.getText('username', 0) || '').replace(/^@/, '');
        if (!username) return ctx.invalidUsage();
        const status = await fetchTikTokStatus(username).catch((error) => ({ error: error.message }));
        const preferredUrl = status?.isLive ? (`https://www.tiktok.com/@${username}/live`) : (status?.latestVideoUrl || status?.finalUrl || `https://www.tiktok.com/@${username}`);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok test', status.error ? `Error: **${status.error}**` : `Account: **@${username}**\nLatest video: ${status.latestVideoId || 'none'}\nLive: ${status.isLive ? 'yes' : 'no'}\nLive room: ${status.liveRoomId || 'none'}\nSource: ${status.source || 'n/a'}\nURL: ${preferredUrl}`)] });
      }
    }),
    makeSimpleCommand({
      name: 'tiktokforcecheck',
      aliases: ['ttcheck'],
      category: 'TikTok',
      description: 'Force a TikTok watcher check',
      usage: 'tiktokforcecheck',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageGuild],
      slash: { root: 'tiktok', sub: 'tiktokforcecheck', description: 'Force a TikTok watcher check' },
      async execute(ctx) {
        await ctx.client.runTikTokCheck();
        const count = ctx.guildConfig.tiktok.watchers.length;
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🎵 TikTok', `Forced watcher check complete for **${count}** watcher(s). Use \`${ctx.prefix}tiktoklist\` to see latest errors/sources.`)] });
      }
    }),


    makeSimpleCommand({
      name: 'piconly',
      aliases: ['imageonly', 'mediaonly', 'picchannel'],
      category: 'Security',
      description: 'Allow only images in a channel',
      usage: 'piconly [#channel] <on|off>',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: {
        root: 'security',
        sub: 'piconly',
        description: 'Allow only images in a channel',
        options: [
          { type: 'channel', name: 'channel', description: 'Target channel', required: false, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement] },
          { type: 'string', name: 'state', description: 'on / off', required: true, choices: [{ name: 'on', value: 'on' }, { name: 'off', value: 'off' }] }
        ]
      },
      async execute(ctx) {
        const channel = await ctx.getChannel('channel', 0) || ctx.channel;
        const state = (ctx.interaction ? ctx.getText('state', 0) : (ctx.args.length >= 2 ? ctx.args[1] : ctx.args[0]))?.toLowerCase();
        if (!channel || !channel.isTextBased?.() || !['on', 'off'].includes(state || '')) {
          return ctx.invalidUsage(`Example: \`${ctx.prefix}piconly #photos on\` or \`${ctx.prefix}piconly off\``);
        }
        ctx.store.updateGuild(ctx.guild.id, (guild) => {
          guild.automod.picOnlyChannels = guild.automod.picOnlyChannels || [];
          guild.automod.picOnlyChannels = guild.automod.picOnlyChannels.filter((id) => id !== channel.id);
          if (state === 'on') guild.automod.picOnlyChannels.push(channel.id);
          return guild;
        });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🖼️ Pic only', `${channel} is now **${state === 'on' ? 'image only' : 'normal'}**.`)] });
      }
    }),
    makeSimpleCommand({
      name: 'piconlylist',
      aliases: ['imageonlylist', 'medialist'],
      category: 'Security',
      description: 'List channels with image-only mode',
      usage: 'piconlylist',
      guildOnly: true,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      slash: { root: 'security', sub: 'piconlylist', description: 'List image-only channels' },
      async execute(ctx) {
        const ids = ctx.guildConfig.automod?.picOnlyChannels || [];
        const lines = ids.map((id) => ctx.guild.channels.cache.get(id)).filter(Boolean).map((channel) => `• ${channel}`);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🖼️ Pic only channels', lines.length ? lines.join('\n') : 'No channels are in image-only mode.')] });
      }
    }),

    ownerBase('setstatus', 'Change the bot status', 'setstatus <online|idle|dnd|invisible>', ['status', 'botstatus'], [{ type: 'string', name: 'status', description: 'Status', required: true, choices: ['online', 'idle', 'dnd', 'invisible'].map((value) => ({ name: value, value })) }], async (ctx) => {
      const status = ctx.getText('status', 0);
      if (!status) return ctx.invalidUsage();
      ctx.store.updateGlobal((global) => { global.presence.status = status; return global; });
      ctx.client.applyPresence();
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Status updated', `Bot status is now **${status}**.`)] });
    }),
    ownerBase('setactivity', 'Change the bot activity type/text', 'setactivity <type> <text>', ['activity', 'botactivity'], [{ type: 'string', name: 'type', description: 'Type', required: true, choices: Object.keys(ACTIVITY_TYPES).map((value) => ({ name: value, value })) }, { type: 'string', name: 'text', description: 'Activity text', required: true }], async (ctx) => {
      const type = ctx.getText('type', 0);
      const text = ctx.interaction ? ctx.interaction.options.getString('text') : ctx.getRest(1);
      if (!type || !text || typeof ACTIVITY_TYPES[type] === 'undefined') return ctx.invalidUsage('Valid activity types: `playing`, `streaming`, `listening`, `watching`, `custom`, `competing`. Example: `+setactivity watching over the server`.');
      ctx.store.updateGlobal((global) => {
        global.presence.activityType = type;
        global.presence.activityText = text;
        return global;
      });
      ctx.client.applyPresence();
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Activity updated', `Type: **${type}**\nText: **${text}**`)] });
    }),
    ownerBase('setbotname', 'Change the bot username', 'setbotname <name>', ['setname', 'botname', 'setusername', 'namebot'], [{ type: 'string', name: 'name', description: 'New bot name', required: true }], async (ctx) => {
      const name = ctx.interaction ? ctx.interaction.options.getString('name') : ctx.getRest(0);
      if (!name) return ctx.invalidUsage();
      try {
        await ctx.client.user.setUsername(name);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Bot name updated', `New bot name: **${name}**`)] });
      } catch (error) {
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, 'Bot name failed', `Discord rejected the username change.\n${code(error.message || error)}`)] });
      }
    }),
    ownerBase('setbotavatar', 'Change the bot avatar', 'setbotavatar <url>', ['setavatar', 'botavatar'], [{ type: 'string', name: 'url', description: 'Image URL', required: true }], async (ctx) => {
      const url = ctx.getText('url', 0);
      if (!url) return ctx.invalidUsage();
      try {
        await ctx.client.user.setAvatar(url);
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Bot avatar updated', 'The bot avatar was updated.')] });
      } catch (error) {
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, 'Bot avatar failed', code(error.message || error))] });
      }
    }),
    ownerBase('guilds', 'List connected guilds', 'guilds', ['servers'], [], async (ctx) => {
      const list = ctx.client.guilds.cache.map((guild) => `• **${guild.name}** — ${guild.id}`).join('\n').slice(0, 3900);
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Guilds', list || 'No guilds.')] });
    }),
    ownerBase('leaveguild', 'Leave a guild by ID', 'leaveguild <guildId>', ['leave'], [{ type: 'string', name: 'id', description: 'Guild ID', required: true }], async (ctx) => {
      const id = ctx.getText('id', 0);
      const guild = ctx.client.guilds.cache.get(id);
      if (!guild) return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, 'Leave guild', 'Guild not found.')] });
      await guild.leave().catch(() => null);
      await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Left guild', `Left **${guild.name}**.`)] });
    }),
    ownerBase('eval', 'Evaluate JavaScript', 'eval <code>', [], [{ type: 'string', name: 'code', description: 'Code', required: true }], async (ctx) => {
      const raw = ctx.interaction ? ctx.interaction.options.getString('code') : ctx.getRest(0);
      if (!raw) return ctx.invalidUsage();
      try {
        let output = await eval(raw);
        if (typeof output !== 'string') output = require('util').inspect(output, { depth: 1 });
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '👑 Eval', code(output.slice(0, 3900)))] });
      } catch (error) {
        await ctx.reply({ embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, 'Eval error', code(String(error)))] });
      }
    })
  ];

  return commands;
}



const AUTO_REACT_PRESETS = {
  hype: { emojis: ['🔥', '⚡', '💯'], mode: 'random', maxReactions: 2, chance: 100 },
  cute: { emojis: ['💖', '✨', '🫶'], mode: 'random', maxReactions: 2, chance: 100 },
  fun: { emojis: ['😂', '🤣', '😭'], mode: 'random', maxReactions: 2, chance: 100 },
  approval: { emojis: ['✅', '👀', '💯'], mode: 'rotate', maxReactions: 1, chance: 100 }
};

function normalizeAutoReactEntry(entry = null) {
  return {
    enabled: entry?.enabled !== false,
    emojis: [...new Set((entry?.emojis || []).map((emoji) => parseEmojiArg(emoji)).filter(Boolean))].slice(0, 12),
    mode: ['random', 'all', 'rotate'].includes(entry?.mode) ? entry.mode : 'random',
    maxReactions: Math.max(1, Math.min(5, Number(entry?.maxReactions) || 1)),
    chance: Math.max(1, Math.min(100, Number(entry?.chance) || 100)),
    cooldownSeconds: Math.max(0, Math.min(300, Number(entry?.cooldownSeconds) || 0)),
    allowBots: Boolean(entry?.allowBots),
    ignoreCommands: entry?.ignoreCommands !== false,
    triggerWords: [...new Set((entry?.triggerWords || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 12)
  };
}

function parseAutoReactEmojiList(raw = '') {
  return [...new Set(String(raw || '').split(/\s+/).map((part) => parseEmojiArg(part)).filter(Boolean))].slice(0, 12);
}

function parseAutoReactTriggerList(raw = '') {
  const text = String(raw || '').trim();
  if (!text || ['off', 'none', 'clear', 'reset'].includes(text.toLowerCase())) return [];
  const parts = text.includes(',') ? text.split(',') : text.split(/\s+/);
  return [...new Set(parts.map((part) => part.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

function formatAutoReactMode(mode = 'random') {
  return mode === 'all' ? 'all emojis' : mode === 'rotate' ? 'rotation' : 'random';
}

function buildAutoReactConfigEmbed(guildConfig, channel, entry, note = '') {
  const normalized = normalizeAutoReactEntry(entry || {});
  const exists = entry && (normalized.emojis.length || normalized.triggerWords.length || normalized.enabled !== false);
  const embed = baseEmbed(guildConfig, '⚡ Auto-react config', exists ? `Configuration for ${channel}.` : `No auto-react rule exists yet for ${channel}.`);
  if (note) embed.setDescription(`${embed.data.description}\n\n${note}`);
  embed.addFields(
    { name: 'State', value: exists ? (normalized.enabled ? '🟢 enabled' : '🔴 disabled') : 'Not configured', inline: true },
    { name: 'Mode', value: formatAutoReactMode(normalized.mode), inline: true },
    { name: 'Count / chance', value: `${normalized.maxReactions} reaction(s) • ${normalized.chance}%`, inline: true },
    { name: 'Emojis', value: normalized.emojis.length ? normalized.emojis.join(' ') : 'none', inline: false },
    { name: 'Filters', value: [
      `Cooldown: **${normalized.cooldownSeconds}s**`,
      `Bots: **${normalized.allowBots ? 'allowed' : 'ignored'}**`,
      `Commands: **${normalized.ignoreCommands ? 'ignored' : 'reacted too'}**`,
      `Triggers: ${normalized.triggerWords.length ? normalized.triggerWords.map((word) => `\`${word}\``).join(', ') : 'none'}`
    ].join('\n'), inline: false },
    { name: 'Quick examples', value: [
      '`+autoreact add #general 🔥 😂`',
      '`+autoreact mode #general rotate`',
      '`+autoreact count #general 2`',
      '`+autoreact chance #general 60`',
      '`+autoreact trigger #general clip montage`',
      '`+autoreact preset #general hype`'
    ].join(' • ').slice(0, 1024), inline: false }
  );
  return embed;
}

function buildAutoReactOverviewEmbed(guildConfig, guild, entries = []) {
  const active = entries.filter(([, entry]) => normalizeAutoReactEntry(entry).enabled && normalizeAutoReactEntry(entry).emojis.length);
  const description = entries.length
    ? entries.slice(0, 12).map(([channelId, entry]) => {
        const normalized = normalizeAutoReactEntry(entry);
        return [
          `**<#${channelId}>** • ${normalized.enabled ? 'on' : 'off'} • ${formatAutoReactMode(normalized.mode)}`,
          `Emojis: ${normalized.emojis.join(' ') || 'none'}`,
          `Count: **${normalized.maxReactions}** • Chance: **${normalized.chance}%** • Cooldown: **${normalized.cooldownSeconds}s**${normalized.triggerWords.length ? ` • Triggers: ${normalized.triggerWords.map((word) => `\`${word}\``).join(', ')}` : ''}`
        ].join('\n');
      }).join('\n\n')
    : 'No auto-react channel configured yet.';
  return baseEmbed(guildConfig, '⚡ Auto-react overview', description.slice(0, 4000)).addFields(
    { name: 'Summary', value: [
      `Configured channels: **${entries.length}**`,
      `Active channels: **${active.length}**`,
      `Server: **${guild?.name || 'Unknown'}**`
    ].join('\n'), inline: true },
    { name: 'Starter setup', value: [
      '`+autoreact add #general 🔥 😂`',
      '`+autoreact count #general 2`',
      '`+autoreact preset #clips fun`'
    ].join('\n'), inline: true }
  );
}

function computeServerProgressSnapshot(guild, guildConfig = {}) {
  const live = getLiveGuildStats(guild);
  const boosts = guild?.premiumSubscriptionCount || 0;
  const roleCount = guild?.roles?.cache?.filter((role) => role.id !== guild.id).size || 0;
  const channelCount = guild?.channels?.cache?.filter((channel) => !channel.isThread?.()).size || 0;
  const configuredLevels = Object.values(guildConfig.permissions?.levels || {}).filter((entry) => entry?.roleId || (entry?.commands || []).length).length;
  const securityEnabled = [
    guildConfig.automod?.antiSpam?.enabled,
    guildConfig.automod?.antiLink?.enabled,
    guildConfig.automod?.antiInvite?.enabled,
    guildConfig.automod?.antiMention?.enabled,
    guildConfig.automod?.antiCaps?.enabled,
    guildConfig.automod?.antiEmojiSpam?.enabled,
    guildConfig.automod?.ghostPing?.enabled,
    guildConfig.automod?.raidMode?.enabled,
    guildConfig.automod?.badWordsEnabled
  ].filter(Boolean).length;
  const rolePanelCount = Object.keys(guildConfig.roles?.rolePanels || {}).length + Object.keys(guildConfig.roles?.reactionRoles || {}).length;
  const autoReactCount = Object.values(guildConfig.autoReact?.channels || {}).filter((entry) => normalizeAutoReactEntry(entry).enabled && normalizeAutoReactEntry(entry).emojis.length).length;
  const stickyCount = Object.keys(guildConfig.sticky || {}).length;
  const modules = [
    ['Welcome', guildConfig.welcome?.enabled && guildConfig.welcome?.channelId],
    ['Leave', guildConfig.leave?.enabled && guildConfig.leave?.channelId],
    ['Logs', guildConfig.logs?.enabled && (guildConfig.logs?.channelId || guildConfig.logs?.channels?.default || Object.values(guildConfig.logs?.channels || {}).some(Boolean))],
    ['Ghost ping', guildConfig.automod?.ghostPing?.enabled],
    ['Support', guildConfig.support?.enabled && guildConfig.support?.channelId],
    ['Auto roles', (guildConfig.roles?.autoRoles || []).length > 0],
    ['Role panels', rolePanelCount > 0],
    ['Status role', guildConfig.roles?.statusRole?.enabled && guildConfig.roles?.statusRole?.roleId && guildConfig.roles?.statusRole?.matchText],
    ['Voice hub', guildConfig.voice?.temp?.hubChannelId || guildConfig.voice?.temp?.panelMessageId],
    ['Voice moderation', guildConfig.voice?.moderation?.muteRoleId || guildConfig.voice?.moderation?.banRoleId],
    ['Stats', guildConfig.stats?.enabled && Object.values(guildConfig.stats?.channels || {}).some(Boolean)],
    ['TikTok', (guildConfig.tiktok?.watchers || []).length > 0],
    ['Security', securityEnabled > 0],
    ['Permission levels', configuredLevels > 0],
    ['Sticky', stickyCount > 0],
    ['Auto react', autoReactCount > 0]
  ];
  const completedModules = modules.filter(([, enabled]) => Boolean(enabled)).length;
  const completionPercent = Math.round((completedModules / Math.max(1, modules.length)) * 100);
  const setupTier = completionPercent >= 90 ? 'Legend' : completionPercent >= 75 ? 'Diamond' : completionPercent >= 55 ? 'Gold' : completionPercent >= 35 ? 'Silver' : 'Bronze';
  const growthMilestones = [25, 50, 100, 250, 500, 1000];
  const boostMilestones = [1, 7, 14];
  const voiceMilestones = [5, 10, 20, 50];
  const unlockedGrowth = growthMilestones.filter((value) => live.members >= value).length;
  const unlockedBoosts = boostMilestones.filter((value) => boosts >= value).length;
  const unlockedVoice = voiceMilestones.filter((value) => live.voice >= value).length;
  const nextGrowth = growthMilestones.find((value) => live.members < value) || null;
  const nextBoost = boostMilestones.find((value) => boosts < value) || null;
  const nextVoice = voiceMilestones.find((value) => live.voice < value) || null;
  const customGoals = {
    members: computeGoalProgress(live.members, guildConfig.progress?.customGoals?.members),
    boosts: computeGoalProgress(boosts, guildConfig.progress?.customGoals?.boosts),
    voice: computeGoalProgress(live.voice, guildConfig.progress?.customGoals?.voice)
  };
  const customGoalCount = Object.values(customGoals).filter(Boolean).length;
  const memberMilestoneReward = guildConfig.progress?.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
  const nextMemberRewardAt = getNextMemberRewardTarget(live.members, memberMilestoneReward.interval);
  return {
    live,
    boosts,
    roleCount,
    channelCount,
    modules,
    completedModules,
    completionPercent,
    setupTier,
    configuredLevels,
    securityEnabled,
    rolePanelCount,
    growthMilestones,
    boostMilestones,
    voiceMilestones,
    unlockedGrowth,
    unlockedBoosts,
    unlockedVoice,
    nextGrowth,
    nextBoost,
    nextVoice,
    customGoals,
    customGoalCount,
    memberMilestoneReward,
    nextMemberRewardAt,
    autoReactCount,
    stickyCount
  };
}

function createDashboardEmbed(guildConfig, guild, page = 'home') {
  const g = guildConfig || {};
  const pages = ['home', 'setup', 'logs', 'security', 'voice', 'automation', 'progress'];
  const safePage = pages.includes(page) ? page : 'home';
  const memberCount = guild?.memberCount || guild?.members?.cache?.size || 0;
  const boostCount = guild?.premiumSubscriptionCount || 0;
  const onlineCount = guild?.presences?.cache ? guild.presences.cache.filter((presence) => presence?.status && presence.status !== 'offline').size : 0;
  const voiceCount = guild?.voiceStates?.cache ? guild.voiceStates.cache.filter((state) => state?.channelId && !state?.member?.user?.bot).size : 0;
  const snapshot = computeServerProgressSnapshot(guild, g);
  const autoReactEntries = Object.entries(g.autoReact?.channels || {});
  const autoReactActive = autoReactEntries.filter(([, entry]) => normalizeAutoReactEntry(entry).enabled && normalizeAutoReactEntry(entry).emojis.length).length;
  const stickyCount = Object.keys(g.sticky || {}).length;
  const embed = baseEmbed(g, '🧩 DvL Dashboard', 'Overview panel for the server setup and live modules.');

  if (safePage === 'home') {
    embed
      .setDescription('Everything important in one clean panel. Use the buttons below to switch sections.')
      .addFields(
        {
          name: 'Server',
          value: [
            `**Members:** ${formatStatNumber(memberCount)}`,
            `**Online:** ${formatStatNumber(onlineCount)}`,
            `**In voice:** ${formatStatNumber(voiceCount)}`,
            `**Boosts:** ${formatStatNumber(boostCount)}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Core modules',
          value: [
            `**Logs:** ${g.logs?.enabled ? 'on' : 'off'}`,
            `**Welcome:** ${g.welcome?.enabled ? 'on' : 'off'}`,
            `**Support:** ${g.support?.enabled ? 'on' : 'off'}`,
            `**Stats:** ${g.stats?.enabled ? 'on' : 'off'}`,
            `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}`,
            `**Auto-react:** ${autoReactActive} channel(s)`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Quick setup',
          value: [
            '`+logs`',
            '`+statssetup`',
            '`+trophychannel here`',
            '`+ghostping on`',
            '`+autoreact preset #general hype`',
            '`+stickyset <message>`'
          ].join(' • '),
          inline: false
        }
      );
  }

  if (safePage === 'setup') {
    embed
      .setTitle('🧩 DvL Dashboard • Setup')
      .setDescription('Big picture of the current server setup.')
      .addFields(
        {
          name: 'Core setup',
          value: [
            `**Prefix:** \`${g.prefix || '+'}\``,
            `**Embed color:** \`${g.embedColor || '#5865F2'}\``,
            `**Language:** **${g.language || 'en'}**`,
            `**Setup tier:** **${snapshot.setupTier}**`,
            `**Completion:** **${snapshot.completionPercent}%**`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Configured modules',
          value: snapshot.modules.map(([label, ok]) => `${ok ? '✅' : '⬜'} ${label}`).join('\n').slice(0, 1024),
          inline: true
        },
        {
          name: 'Useful commands',
          value: '`+config` • `+setup` • `+setupcheck` • `+logs` • `+dashboard automation`',
          inline: false
        }
      );
  }

  if (safePage === 'logs') {
    const routes = g.logs?.channels || {};
    embed
      .setTitle('🧾 DvL Dashboard • Logs')
      .setDescription('Logs routing and channel overview.')
      .addFields(
        {
          name: 'Routing',
          value: [
            `**Master:** ${g.logs?.enabled ? 'on' : 'off'}`,
            `**Default:** ${routes.default ? `<#${routes.default}>` : (g.logs?.channelId ? `<#${g.logs.channelId}>` : 'not set')}`,
            `**Messages:** ${routes.messages ? `<#${routes.messages}>` : 'default'}`,
            `**Members:** ${routes.members ? `<#${routes.members}>` : 'default'}`,
            `**Moderation:** ${routes.moderation ? `<#${routes.moderation}>` : 'default'}`,
            `**Voice:** ${routes.voice ? `<#${routes.voice}>` : 'default'}`,
            `**Server:** ${routes.server ? `<#${routes.server}>` : 'default'}`,
            `**Social:** ${routes.social ? `<#${routes.social}>` : 'default'}`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Useful commands',
          value: '`+logs` • `+setlogchannel #logs` • `+setlogchannel messages #msg-logs` • `+logconfig`',
          inline: false
        }
      );
  }

  if (safePage === 'security') {
    const mod = g.automod || {};
    embed
      .setTitle('🚨 DvL Dashboard • Security')
      .setDescription('Security / AutoMod view with the current thresholds and actions.')
      .addFields(
        { name: 'Filters', value: [
          `**Anti-spam:** ${automodRuleLabel(mod.antiSpam)}`,
          `**Anti-link:** ${automodRuleLabel(mod.antiLink)}`,
          `**Anti-invite:** ${automodRuleLabel(mod.antiInvite)}`,
          `**Ghost ping:** **${mod.ghostPing?.enabled ? 'on' : 'off'}**${mod.ghostPing?.channelId ? ` • <#${mod.ghostPing.channelId}>` : ''}`
        ].join('\n'), inline: false },
        { name: 'Abuse protection', value: [
          `**Mention spam:** ${automodRuleLabel(mod.antiMention)}`,
          `**Caps:** ${automodRuleLabel(mod.antiCaps)}`,
          `**Emoji spam:** ${automodRuleLabel(mod.antiEmojiSpam)}`,
          `**Raid mode:** ${automodRuleLabel(mod.raidMode, 'delete')}`,
          `**Blocked words:** **${mod.badWordsEnabled ? 'on' : 'off'}** • ${mod.badWords?.length || 0} word(s)`
        ].join('\n'), inline: false },
        { name: 'Useful commands', value: '`+securitypreset balanced` • `+setantispam 6 6 timeout` • `+setantimention 5 delete` • `+ghostping test` • `+automodignore #channel`', inline: false }
      );
  }

  if (safePage === 'voice') {
    const temp = g.voice?.temp || {};
    const moderation = g.voice?.moderation || {};
    embed
      .setTitle('🔊 DvL Dashboard • Voice')
      .setDescription('Voice system, temp voice and voice moderation overview.')
      .addFields(
        { name: 'Temp voice', value: [
          `**Hub:** ${temp.hubChannelId ? `<#${temp.hubChannelId}>` : 'not set'}`,
          `**Panel:** ${temp.panelChannelId ? `<#${temp.panelChannelId}>` : 'not set'}`,
          `**Category:** ${temp.hubCategoryId ? `<#${temp.hubCategoryId}>` : 'not set'}`,
          `**Default limit:** ${temp.defaultLimit || 0}`
        ].join('\n'), inline: true },
        { name: 'Voice moderation', value: [
          `**Mute role:** ${moderation.muteRoleId ? `<@&${moderation.muteRoleId}>` : 'not set'}`,
          `**Ban role:** ${moderation.banRoleId ? `<@&${moderation.banRoleId}>` : 'not set'}`,
          `**Stats panel:** ${g.stats?.enabled ? 'on' : 'off'}`,
          `**Current voice users:** ${formatStatNumber(voiceCount)}`
        ].join('\n'), inline: true },
        { name: 'Useful commands', value: '`+voicepanel` • `+createvoc` • `+setvoicemuterole @role` • `+setvoicebanrole @role` • `+statssetup`', inline: false }
      );
  }

  if (safePage === 'automation') {
    embed
      .setTitle('⚡ DvL Dashboard • Automation')
      .setDescription('Useful automations and role systems, with the practical stuff first.')
      .addFields(
        {
          name: 'Auto-react',
          value: [
            `**Configured channels:** ${autoReactEntries.length}`,
            `**Active channels:** ${autoReactActive}`,
            `**Example:** \`+autoreact add #general 🔥 😂\``,
            `**Preset:** \`+autoreact preset #general hype\``
          ].join('\n'),
          inline: true
        },
        {
          name: 'Auto roles / sticky',
          value: [
            `**Auto roles:** ${(g.roles?.autoRoles || []).length}`,
            `**Sticky messages:** ${stickyCount}`,
            `**Ghost ping:** ${g.automod?.ghostPing?.enabled ? 'on' : 'off'}`,
            `**Status role:** ${g.roles?.statusRole?.enabled ? 'on' : 'off'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Support / panels',
          value: [
            `**Support relay:** ${g.support?.enabled ? 'on' : 'off'}`,
            `**TikTok watchers:** ${(g.tiktok?.watchers || []).length}`,
            `**Role panels:** ${Object.keys(g.roles?.rolePanels || {}).length + Object.keys(g.roles?.reactionRoles || {}).length}`,
            `**Quick config:** \`+configpanel\``
          ].join('\n'),
          inline: false
        },
        {
          name: 'Useful commands',
          value: '`+autoreact config` • `+autorolelist` • `+stickyconfig` • `+ghostping config` • `+panel`',
          inline: false
        }
      );
  }

  if (safePage === 'progress') {
    embed
      .setTitle('🏆 DvL Dashboard • Progress')
      .setDescription('Progression, trophies and module completion.')
      .addFields(
        { name: 'Progress', value: [
          `**Setup completion:** ${snapshot.completionPercent}%`,
          `**Completed modules:** ${snapshot.completedModules}/${snapshot.modules.length}`,
          `**Member trophies:** ${snapshot.unlockedGrowth}/${snapshot.growthMilestones.length}`,
          `**Boost trophies:** ${snapshot.unlockedBoosts}/${snapshot.boostMilestones.length}`,
          `**Voice trophies:** ${snapshot.unlockedVoice}/${snapshot.voiceMilestones.length}`
        ].join('\n'), inline: true },
        { name: 'Board', value: [
          `**Trophy board:** ${g.progress?.enabled ? 'on' : 'off'}`,
          `**Channel:** ${g.progress?.channelId ? `<#${g.progress.channelId}>` : 'not set'}`,
          `**Next members trophy:** ${snapshot.nextGrowth || 'done'}`,
          `**Next boost trophy:** ${snapshot.nextBoost || 'done'}`,
          `**Next voice trophy:** ${snapshot.nextVoice || 'done'}`
        ].join('\n'), inline: true },
        { name: 'Useful commands', value: '`+trophy` • `+trophychannel here` • `+trophyrefresh` • `+dashboard`', inline: false }
      );
  }

  return embed.setFooter({ text: `DvL • dashboard • page: ${safePage}` });
}

function createDashboardComponents(current = 'home') {
  const pages = ['home', 'setup', 'logs', 'security', 'voice', 'automation', 'progress'];
  const safePage = pages.includes(current) ? current : 'home';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard:home').setLabel('Home').setEmoji('🏠').setStyle(safePage === 'home' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboard:setup').setLabel('Setup').setEmoji('🧩').setStyle(safePage === 'setup' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:logs').setLabel('Logs').setEmoji('🧾').setStyle(safePage === 'logs' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:security').setLabel('Security').setEmoji('🚨').setStyle(safePage === 'security' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:voice').setLabel('Voice').setEmoji('🔊').setStyle(safePage === 'voice' ? ButtonStyle.Success : ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard:automation').setLabel('Automation').setEmoji('⚡').setStyle(safePage === 'automation' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboard:progress').setLabel('Progress').setEmoji('🏆').setStyle(safePage === 'progress' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`dashboardquick:refresh:${safePage}`).setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dashboardquick:help').setLabel('Help').setEmoji('📂').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dashboardquick:progress').setLabel('Trophy').setEmoji('🥇').setStyle(ButtonStyle.Primary)
    )
  ];
}


const SMART_PANEL_THEMES = {
  default: { color: '#5865F2', label: 'Default' },
  emerald: { color: '#10B981', label: 'Emerald' },
  sunset: { color: '#F97316', label: 'Sunset' },
  neon: { color: '#A855F7', label: 'Neon' }
};

const SMART_TEXT_PRESETS = {
  clean: {
    mode: 'embed',
    footer: 'DvL',
    imageUrl: null,
    color: null,
    titleTransform: (fallback) => fallback || null
  },
  premium: {
    mode: 'embed',
    footer: 'DvL • premium',
    imageUrl: null,
    color: '#8B5CF6',
    titleTransform: (fallback) => fallback ? `✦ ${String(fallback).replace(/^✦\s*/,'')}` : '✦ Announcement'
  },
  minimal: {
    mode: 'plain',
    footer: null,
    imageUrl: null,
    color: null,
    titleTransform: () => null
  }
};

function getSmartPanelState(page = 'home') {
  const raw = String(page || 'home').toLowerCase();
  const textPages = ['welcome', 'leave', 'leave-dm', 'boost'];
  if (textPages.includes(raw)) return { page: 'texts', focus: raw };
  const pages = ['home', 'texts', 'logs', 'support', 'security', 'automation', 'channels', 'repair', 'style'];
  return { page: pages.includes(raw) ? raw : 'home', focus: 'welcome' };
}

function getSmartPanelTextMeta(moduleKey = 'welcome') {
  const safe = String(moduleKey || 'welcome').toLowerCase();
  const map = {
    welcome: {
      key: 'welcome',
      label: 'Welcome',
      command: 'welcome',
      path: ['welcome'],
      enabledKey: 'enabled',
      channelKey: 'channelId',
      hasChannel: true,
      modeKey: 'mode',
      titleKey: 'title',
      messageKey: 'message',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      fallbackTitle: DEFAULT_GUILD.welcome.title,
      source: (g) => g.welcome || {}
    },
    leave: {
      key: 'leave',
      label: 'Leave',
      command: 'leave',
      path: ['leave'],
      enabledKey: 'enabled',
      channelKey: 'channelId',
      hasChannel: true,
      modeKey: 'mode',
      titleKey: 'title',
      messageKey: 'message',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      fallbackTitle: DEFAULT_GUILD.leave.title,
      source: (g) => g.leave || {}
    },
    'leave-dm': {
      key: 'leave-dm',
      label: 'Leave DM',
      command: 'leave',
      path: ['leave'],
      enabledKey: 'dmEnabled',
      channelKey: null,
      hasChannel: false,
      modeKey: 'dmMode',
      titleKey: 'dmTitle',
      messageKey: 'dmMessage',
      footerKey: 'dmFooter',
      colorKey: 'dmColor',
      imageKey: 'dmImageUrl',
      fallbackTitle: DEFAULT_GUILD.leave.dmTitle,
      source: (g) => g.leave || {}
    },
    boost: {
      key: 'boost',
      label: 'Boost',
      command: 'boost',
      path: ['boost'],
      enabledKey: 'enabled',
      channelKey: 'channelId',
      hasChannel: true,
      modeKey: 'mode',
      titleKey: 'title',
      messageKey: 'message',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      fallbackTitle: DEFAULT_GUILD.boost.title,
      source: (g) => g.boost || {}
    }
  };
  return map[safe] || map.welcome;
}

const getPanelTextMeta = getSmartPanelTextMeta;

function getPanelTextSource(guildConfig, moduleKey = 'welcome') {
  const meta = getSmartPanelTextMeta(moduleKey);
  return meta.source(guildConfig || {});
}

function ensureGuildPath(guild, path = []) {
  let cursor = guild;
  for (const key of path) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  return cursor;
}

function updatePanelTextModule(guild, moduleKey, mutator) {
  const meta = getSmartPanelTextMeta(moduleKey);
  const target = ensureGuildPath(guild, meta.path);
  mutator(target, meta);
  return guild;
}

function resetPanelTextModule(guild, moduleKey) {
  const meta = getSmartPanelTextMeta(moduleKey);
  const defaults = meta.key === 'welcome'
    ? DEFAULT_GUILD.welcome
    : meta.key === 'leave'
      ? DEFAULT_GUILD.leave
      : meta.key === 'leave-dm'
        ? DEFAULT_GUILD.leave
        : DEFAULT_GUILD.boost;
  return updatePanelTextModule(guild, moduleKey, (target) => {
    if (meta.key === 'leave-dm') {
      target.dmEnabled = defaults.dmEnabled;
      target.dmMode = defaults.dmMode;
      target.dmTitle = defaults.dmTitle;
      target.dmMessage = defaults.dmMessage;
      target.dmFooter = defaults.dmFooter;
      target.dmColor = defaults.dmColor;
      target.dmImageUrl = defaults.dmImageUrl;
      return;
    }
    target.enabled = defaults.enabled;
    if (meta.channelKey) target[meta.channelKey] = defaults[meta.channelKey];
    target[meta.modeKey] = defaults[meta.modeKey];
    target[meta.titleKey] = defaults[meta.titleKey];
    target[meta.messageKey] = defaults[meta.messageKey];
    target[meta.footerKey] = defaults[meta.footerKey];
    target[meta.colorKey] = defaults[meta.colorKey];
    target[meta.imageKey] = defaults[meta.imageKey];
  });
}

function buildSmartPanelTextState(guildConfig, moduleKey = 'welcome') {
  const meta = getSmartPanelTextMeta(moduleKey);
  const source = getPanelTextSource(guildConfig, moduleKey);
  const lines = [
    `**Status:** ${source?.[meta.enabledKey] ? 'on' : 'off'}`,
    meta.hasChannel ? `**Channel:** ${source?.[meta.channelKey] ? `<#${source[meta.channelKey]}>` : 'not set'}` : '**Channel:** DM only',
    `**Message:** ${formatTemplatePreview(source?.[meta.messageKey], 'not set')}`,
    ...buildAnnouncementStyleLines(guildConfig, source, {
      modeKey: meta.modeKey,
      titleKey: meta.titleKey,
      footerKey: meta.footerKey,
      colorKey: meta.colorKey,
      imageKey: meta.imageKey
    })
  ];
  return lines;
}

function buildPanelTextPreviewPayload(guildConfig, moduleKey, guild, member) {
  const meta = getSmartPanelTextMeta(moduleKey);
  const source = getPanelTextSource(guildConfig, moduleKey);
  const vars = getTextTemplateVars(guild, member);
  return createModulePreviewMessage(guildConfig, source, vars, {
    modeKey: meta.modeKey,
    titleKey: meta.titleKey,
    messageKey: meta.messageKey,
    footerKey: meta.footerKey,
    colorKey: meta.colorKey,
    imageKey: meta.imageKey,
    fallbackTitle: meta.fallbackTitle
  });
}

function getSmartPanelQuickIssues(guildConfig = {}) {
  const issues = [];
  if (guildConfig.welcome?.enabled && !guildConfig.welcome?.channelId) issues.push('welcome is enabled without a channel');
  if (guildConfig.leave?.enabled && !guildConfig.leave?.channelId) issues.push('leave is enabled without a channel');
  if (guildConfig.boost?.enabled && !guildConfig.boost?.channelId) issues.push('boost is enabled without a channel');
  if (guildConfig.logs?.enabled && !(guildConfig.logs?.channels?.default || guildConfig.logs?.channelId)) issues.push('logs are enabled without a default route');
  if (guildConfig.support?.enabled && !guildConfig.support?.channelId) issues.push('support relay is enabled without a relay channel');
  if (guildConfig.support?.restrictToEntry && !guildConfig.support?.entryChannelId) issues.push('support restriction is on without a member channel');
  if (guildConfig.stats?.enabled && !Object.values(guildConfig.stats?.channels || {}).some(Boolean)) issues.push('stats are enabled without counters');
  return issues;
}

function applySmartPanelThemePreset(guild, presetKey = 'default') {
  const preset = SMART_PANEL_THEMES[presetKey] || SMART_PANEL_THEMES.default;
  guild.embedColor = preset.color;
  guild.panel = guild.panel || {};
  guild.panel.theme = presetKey in SMART_PANEL_THEMES ? presetKey : 'default';
  return guild;
}

function applySmartTextPreset(guild, moduleKey = 'welcome', presetKey = 'clean') {
  const preset = SMART_TEXT_PRESETS[presetKey] || SMART_TEXT_PRESETS.clean;
  const meta = getSmartPanelTextMeta(moduleKey);
  const defaultSource = meta.key === 'welcome'
    ? DEFAULT_GUILD.welcome
    : meta.key === 'leave'
      ? DEFAULT_GUILD.leave
      : meta.key === 'leave-dm'
        ? DEFAULT_GUILD.leave
        : DEFAULT_GUILD.boost;
  return updatePanelTextModule(guild, moduleKey, (target) => {
    const currentTitle = target[meta.titleKey] || defaultSource[meta.titleKey] || meta.fallbackTitle;
    target[meta.enabledKey] = true;
    target[meta.modeKey] = preset.mode;
    target[meta.titleKey] = preset.titleTransform(currentTitle);
    target[meta.footerKey] = preset.footer;
    target[meta.colorKey] = preset.color;
    target[meta.imageKey] = preset.imageUrl;
  });
}

function formatSmartThemeLines(guildConfig = {}) {
  const current = guildConfig.panel?.theme || Object.keys(SMART_PANEL_THEMES).find((key) => SMART_PANEL_THEMES[key].color === guildConfig.embedColor) || 'default';
  return Object.entries(SMART_PANEL_THEMES).map(([key, value]) => `${key === current ? '• **' + value.label + '**' : '• ' + value.label} — ${code(value.color)}`);
}

function createConfigPanelEmbed(guildConfig, guild, page = 'home', channel = null) {
  const state = getSmartPanelState(page);
  const safePage = state.page;
  const focus = state.focus || 'welcome';
  const g = guildConfig || {};
  const targetChannel = channel && channel.id ? channel : null;
  const channelMention = targetChannel ? `${targetChannel}` : 'this channel';
  const ghostChannelId = g.automod?.ghostPing?.channelId || null;
  const autoEntry = targetChannel ? normalizeAutoReactEntry(g.autoReact?.channels?.[targetChannel.id] || {}) : null;
  const stats = g.stats || { channels: {}, labels: {} };
  const logs = g.logs || { enabled: false, channels: {}, typeChannels: {}, types: {} };
  const support = g.support || {};
  const whitelistUsers = Array.isArray(g.automod?.whitelistUserIds) ? g.automod.whitelistUserIds.length : 0;
  const whitelistRoles = Array.isArray(g.automod?.whitelistRoleIds) ? g.automod.whitelistRoleIds.length : 0;
  const enabledFilters = ['antiSpam', 'antiLink', 'antiInvite', 'antiMention', 'antiCaps', 'antiEmojiSpam', 'raidMode'].filter((key) => g.automod?.[key]?.enabled).length;

  const embed = baseEmbed(g, '🎛️ DvL Smart Panel', `Quick buttons for ${channelMention}. Keep one main panel instead of hunting through duplicate config commands.`);

  if (safePage === 'home') {
    const issues = getSmartPanelQuickIssues(g);
    embed.addFields(
      {
        name: 'Current state',
        value: [
          `**Texts:** welcome ${g.welcome?.enabled ? 'on' : 'off'} • leave ${g.leave?.enabled ? 'on' : 'off'} • boost ${g.boost?.enabled ? 'on' : 'off'}`,
          `**Logs:** ${logs.enabled ? 'on' : 'off'}${logs.channels?.default ? ` • <#${logs.channels.default}>` : ''}`,
          `**Support:** ${support.enabled ? 'on' : 'off'}${support.channelId ? ` • relay <#${support.channelId}>` : ''}`,
          `**Ghost ping:** ${g.automod?.ghostPing?.enabled ? 'on' : 'off'}${ghostChannelId ? ` • <#${ghostChannelId}>` : ''}`,
          `**Auto-react:** ${targetChannel ? (autoEntry.enabled && autoEntry.emojis.length ? 'on' : 'off') : 'open in a text channel'}`,
          `**Stats:** ${g.stats?.enabled ? 'on' : 'off'}`,
          `**Theme:** ${SMART_PANEL_THEMES[g.panel?.theme || 'default']?.label || 'Custom'} • ${code(g.embedColor || '#5865F2')}`,
          `**Current channel:** ${channelMention}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Persistent control center',
        value: [
          g.panel?.deployedChannelId ? `**Panel channel:** <#${g.panel.deployedChannelId}>` : '**Panel channel:** not deployed',
          g.panel?.deployedMessageId ? `**Message id:** \`${g.panel.deployedMessageId}\`` : '**Message id:** none',
          'Use **Deploy panel** once, then keep that message pinned for staff.'
        ].join('\n'),
        inline: false
      },
      {
        name: 'Detected issues',
        value: issues.length ? issues.slice(0, 6).map((line) => `• ${line}`).join('\n') : 'No obvious issue detected.',
        inline: false
      },
      {
        name: 'Best pages to use first',
        value: [
          '• **Texts** for welcome / leave / boost style',
          '• **Logs** for default log routing',
          '• **Support** for the public support prompt + relay',
          '• **Style** for the global visual theme',
          '• **Repair** when something feels bugged'
        ].join('\n'),
        inline: false
      }
    );
  } else if (safePage === 'texts') {
    const meta = getSmartPanelTextMeta(focus);
    const source = meta.source(g);
    embed
      .setDescription(`Style and test **${meta.label}** directly from buttons. This is the fast version of \`${g.prefix || '+'}${meta.command} ...\`.`)
      .addFields(
        {
          name: `${meta.label} state`,
          value: buildSmartPanelTextState(g, focus).join('\n').slice(0, 1024),
          inline: false
        },
        {
          name: 'Buttons in this page',
          value: [
            '• on/off',
            meta.hasChannel ? '• bind the current channel' : '• toggle DM sending',
            '• embed/plain mode',
            '• edit title, message, footer, color, image',
            '• test and reset'
          ].join('\n'),
          inline: true
        },
        {
          name: 'Useful commands',
          value: [
            `\`${g.prefix || '+'}texts vars\``,
            `\`${g.prefix || '+'}${meta.command} example\``,
            `\`${g.prefix || '+'}${meta.command} test\`` + (focus === 'leave-dm' ? 'dm' : ''),
            meta.hasChannel ? `\`${g.prefix || '+'}${meta.command} channel #channel\`` : `\`${g.prefix || '+'}leave dm on\``
          ].join('\n'),
          inline: true
        },
        {
          name: 'Smart presets',
          value: '• clean\n• premium\n• minimal',
          inline: true
        }
      );
    if (source?.[meta.imageKey] && /^https?:\/\//i.test(String(source[meta.imageKey]))) {
      embed.setThumbnail(String(source[meta.imageKey]));
    }
  } else if (safePage === 'logs') {
    const familyRoutes = Object.entries(logs.channels || {}).filter(([key, value]) => key !== 'default' && value).length;
    const specificRoutes = Object.values(logs.typeChannels || {}).filter(Boolean).length;
    const enabledTypes = Object.entries(logs.types || {}).filter(([, enabled]) => enabled !== false).length;
    embed
      .setDescription(`Logs routing shortcuts for ${channelMention}. Use the full logs panel when you want per-family or per-type routing.`)
      .addFields(
        {
          name: 'Overview',
          value: [
            `**Master:** ${logs.enabled ? 'on' : 'off'}`,
            `**Default route:** ${logs.channels?.default ? `<#${logs.channels.default}>` : 'not set'}`,
            `**Family routes:** ${familyRoutes}`,
            `**Specific type routes:** ${specificRoutes}`,
            `**Enabled events:** ${enabledTypes}`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Fast actions',
          value: [
            '• enable / disable logs',
            '• bind this channel as the default route',
            '• jump into the full logs button panel',
            '• keep ghost ping in the same channel if you want'
          ].join('\n'),
          inline: false
        }
      );
  } else if (safePage === 'support') {
    embed
      .setDescription(`Keep support simple: one public entry channel, one relay, one clean prompt.`)
      .addFields(
        {
          name: 'Routing',
          value: [
            `**Relay:** ${support.enabled ? 'on' : 'off'}`,
            `**Relay channel:** ${support.channelId ? `<#${support.channelId}>` : 'not set'}`,
            `**Member channel:** ${support.entryChannelId ? `<#${support.entryChannelId}>` : 'not set'}`,
            `**Restrict to member channel:** ${support.restrictToEntry ? 'on' : 'off'}`,
            `**Ping role:** ${support.pingRoleId ? `<@&${support.pingRoleId}>` : 'none'}`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Prompt style',
          value: [
            `**Mode:** ${String(support.promptMode || 'embed').toLowerCase() === 'plain' ? 'plain' : 'embed'}`,
            `**Title:** ${formatTemplatePreview(support.promptTitle, 'default')}`,
            `**Message:** ${formatTemplatePreview(support.promptMessage, 'default')}`,
            `**Footer:** ${formatTemplatePreview(support.promptFooter, 'default')}`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Use this page for',
          value: [
            '• relay on/off',
            '• bind relay here',
            '• bind support entry here',
            '• restrict support to one channel',
            '• open the full support text editor'
          ].join('\n'),
          inline: false
        }
      );
  } else if (safePage === 'security') {
    embed
      .setDescription(`Fast security view for ghost ping, whitelist and the main filters.`)
      .addFields(
        {
          name: 'Security state',
          value: [
            `**Main filters enabled:** ${enabledFilters}`,
            `**Ghost ping:** ${g.automod?.ghostPing?.enabled ? 'on' : 'off'}${ghostChannelId ? ` • <#${ghostChannelId}>` : ''}`,
            `**Whitelist users:** ${whitelistUsers}`,
            `**Whitelist roles:** ${whitelistRoles}`,
            `**Pic-only channels:** ${Array.isArray(g.automod?.picOnlyChannels) ? g.automod.picOnlyChannels.length : 0}`,
            `**Ignored channels:** ${Array.isArray(g.automod?.ignoredChannels) ? g.automod.ignoredChannels.length : 0}`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Fast actions',
          value: [
            '• toggle ghost ping',
            '• bind ghost ping here',
            '• run a ghost ping test',
            '• open the security hub',
            '• inspect the whitelist cleanly'
          ].join('\n'),
          inline: false
        }
      );
  } else if (safePage === 'automation') {
    embed
      .setDescription(`Automation tools for ${channelMention}.`)
      .addFields(
        {
          name: 'Auto-react',
          value: targetChannel ? [
            `**Enabled:** ${autoEntry.enabled && autoEntry.emojis.length ? 'yes' : 'no'}`,
            `**Mode:** ${formatAutoReactMode(autoEntry.mode)}`,
            `**Count:** ${autoEntry.maxReactions}`,
            `**Chance:** ${autoEntry.chance}%`,
            `**Emojis:** ${autoEntry.emojis.length ? autoEntry.emojis.join(' ') : 'none'}`
          ].join('\n') : 'Open this panel inside a text channel.',
          inline: false
        },
        {
          name: 'Other automation',
          value: [
            `**Auto roles:** ${(g.roles?.autoRoles || []).length}`,
            `**Sticky in this channel:** ${targetChannel && g.sticky?.[targetChannel.id] ? 'yes' : 'no'}`,
            `**Ghost ping:** ${g.automod?.ghostPing?.enabled ? 'on' : 'off'}`,
            `**Status role:** ${g.roles?.statusRole?.enabled ? 'on' : 'off'}`
          ].join('\n'),
          inline: false
        }
      );
  } else if (safePage === 'channels') {
    embed
      .setDescription(`Channel tools for ${channelMention}. This is mainly for logs, stats and quick bindings.`)
      .addFields(
        {
          name: 'Stats binding',
          value: [
            `**Members counter:** ${stats.channels?.members ? `<#${stats.channels.members}>` : 'not set'}`,
            `**Online counter:** ${stats.channels?.online ? `<#${stats.channels.online}>` : 'not set'}`,
            `**Voice counter:** ${stats.channels?.voice ? `<#${stats.channels.voice}>` : 'not set'}`,
            `**Tip:** use this page from inside a voice channel if you want to bind it as a stat counter.`
          ].join('\n'),
          inline: false
        },
        {
          name: 'Labels',
          value: [
            `**Members:** ${clipText(stats.labels?.members || '👥・Membres : {count}', 80)}`,
            `**Online:** ${clipText(stats.labels?.online || '🌐・En ligne : {count}', 80)}`,
            `**Voice:** ${clipText(stats.labels?.voice || '🔊・Vocal : {count}', 80)}`
          ].join('\n'),
          inline: false
        }
      );
  } else if (safePage === 'style') {
    const currentTheme = g.panel?.theme || 'default';
    embed
      .setDescription('Global visual theme for embeds, smart panel and most premium status messages.')
      .addFields(
        {
          name: 'Current theme',
          value: [
            `**Preset:** ${SMART_PANEL_THEMES[currentTheme]?.label || 'Custom'}`,
            `**Embed color:** ${code(g.embedColor || '#5865F2')}`,
            'Use a preset, then fine-tune module colors only when needed.'
          ].join('\n'),
          inline: false
        },
        {
          name: 'Available presets',
          value: formatSmartThemeLines(g).join('\n').slice(0, 1024),
          inline: false
        }
      );
  } else if (safePage === 'repair') {
    embed
      .setDescription('When something feels off, use this page instead of guessing which old config command to run.')
      .addFields(
        {
          name: 'What gets checked',
          value: [
            '• text objects and modes',
            '• log routes and invalid channel IDs',
            '• support channels / roles / prompt config',
            '• whitelist IDs and security lists',
            '• stats category and missing counters'
          ].join('\n'),
          inline: false
        },
        {
          name: 'Best use',
          value: [
            '• after deleting channels / roles',
            '• after importing an old backup',
            '• when stats stop updating',
            '• when support relay points nowhere',
            '• when logs feel half-configured'
          ].join('\n'),
          inline: false
        }
      );
  }

  return embed.setFooter({ text: `DvL • smart panel • page: ${safePage}${safePage === 'texts' ? ` • module: ${focus}` : ''}` });
}

function createConfigPanelComponents(current = 'home', channelId = null) {
  const state = getSmartPanelState(current);
  const safePage = state.page;
  const focus = state.focus || 'welcome';
  const cid = channelId || '0';

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:page:home').setLabel('Home').setEmoji('🏠').setStyle(safePage === 'home' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:page:texts').setLabel('Texts').setEmoji('📝').setStyle(safePage === 'texts' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:logs').setLabel('Logs').setEmoji('🧾').setStyle(safePage === 'logs' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:support').setLabel('Support').setEmoji('📨').setStyle(safePage === 'support' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:security').setLabel('Security').setEmoji('🚨').setStyle(safePage === 'security' ? ButtonStyle.Success : ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:page:automation').setLabel('Automation').setEmoji('⚡').setStyle(safePage === 'automation' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:channels').setLabel('Channels').setEmoji('🧩').setStyle(safePage === 'channels' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:repair').setLabel('Repair').setEmoji('🧰').setStyle(safePage === 'repair' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:style').setLabel('Style').setEmoji('🎨').setStyle(safePage === 'style' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:refresh:${safePage}`).setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    )
  ];

  if (safePage === 'home') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:page:texts').setLabel('Open texts').setEmoji('📝').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:page:support').setLabel('Open support').setEmoji('📨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:security').setLabel('Open security').setEmoji('🚨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:page:style').setLabel('Open style').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:deploy').setLabel('Deploy panel').setEmoji('📌').setStyle(ButtonStyle.Success)
    ));
  } else if (safePage === 'texts') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:textview:welcome').setLabel('Welcome').setStyle(focus === 'welcome' ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:textview:leave').setLabel('Leave').setStyle(focus === 'leave' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:textview:leave-dm').setLabel('Leave DM').setStyle(focus === 'leave-dm' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:textview:boost').setLabel('Boost').setStyle(focus === 'boost' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:textvars').setLabel('Vars').setEmoji('🧩').setStyle(ButtonStyle.Secondary)
    ));
    if (focus === 'leave-dm') {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cfgpanel:texttoggle:${focus}`).setLabel('DM on/off').setEmoji('📨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`cfgpanel:textmode:${focus}`).setLabel('Embed/plain').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:title`).setLabel('Title').setEmoji('🏷️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:message`).setLabel('Message').setEmoji('💬').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:footer`).setLabel('Footer').setEmoji('🧷').setStyle(ButtonStyle.Secondary)
      ));
    } else {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cfgpanel:texttoggle:${focus}`).setLabel('On/off').setEmoji('✅').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`cfgpanel:texthere:${focus}`).setLabel('Channel here').setEmoji('📍').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textmode:${focus}`).setLabel('Embed/plain').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:title`).setLabel('Title').setEmoji('🏷️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:message`).setLabel('Message').setEmoji('💬').setStyle(ButtonStyle.Secondary)
      ));
    }
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:footer`).setLabel('Footer').setEmoji('🧷').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:color`).setLabel('Color').setEmoji('🌈').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:textedit:${focus}:image`).setLabel('Image').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:texttest:${focus}`).setLabel('Test').setEmoji('🧪').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`cfgpanel:textreset:${focus}`).setLabel('Reset').setEmoji('♻️').setStyle(ButtonStyle.Danger)
    ));
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfgpanel:textpreset:${focus}:clean`).setLabel('Preset clean').setEmoji('✨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:textpreset:${focus}:premium`).setLabel('Preset premium').setEmoji('💎').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:textpreset:${focus}:minimal`).setLabel('Preset minimal').setEmoji('🪶').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'logs') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:logtoggle').setLabel('Logs on/off').setEmoji('🧾').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:logshere').setLabel('Default here').setEmoji('📍').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:openlogs').setLabel('Full logs panel').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:ghosthere').setLabel('Ghost here').setEmoji('👻').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:refresh:logs').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'support') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:supporttoggle').setLabel('Relay on/off').setEmoji('📨').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:supportrelayhere').setLabel('Relay here').setEmoji('🧾').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:supportentryhere').setLabel('Support here').setEmoji('📍').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:supportrestrict').setLabel('Restrict').setEmoji('🚧').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:supportsend').setLabel('Send prompt').setEmoji('📤').setStyle(ButtonStyle.Success)
    ));
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:supportopen').setLabel('Open full panel').setEmoji('🎛️').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'security') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:ghosttoggle').setLabel('Ghost on/off').setEmoji('👻').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:ghosthere').setLabel('Ghost here').setEmoji('📍').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:ghosttest').setLabel('Ghost test').setEmoji('🧪').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:securityopen').setLabel('Security hub').setEmoji('🚨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:whitelistview').setLabel('Whitelist').setEmoji('✅').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'automation') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfgpanel:artoggle:${cid}`).setLabel('Auto-react on/off').setEmoji('✨').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`cfgpanel:arhype:${cid}`).setLabel('Preset hype').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:aroff:${cid}`).setLabel('Auto-react off').setEmoji('🛑').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:stickyoff:${cid}`).setLabel('Sticky off').setEmoji('📌').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:refresh:automation').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'channels') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfgpanel:statsmembers:${cid}`).setLabel('Bind members').setEmoji('👥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`cfgpanel:statsonline:${cid}`).setLabel('Bind online').setEmoji('🌐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`cfgpanel:statsvoice:${cid}`).setLabel('Bind voice').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:logshere').setLabel('Logs here').setEmoji('🧾').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:refresh:channels').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'style') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:theme:default').setLabel('Default').setEmoji('🟦').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:theme:emerald').setLabel('Emerald').setEmoji('🟩').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:theme:sunset').setLabel('Sunset').setEmoji('🟧').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:theme:neon').setLabel('Neon').setEmoji('🟪').setStyle(ButtonStyle.Secondary)
    ));
  } else if (safePage === 'repair') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:repair:all').setLabel('Repair all').setEmoji('🧰').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfgpanel:repair:texts').setLabel('Texts').setEmoji('📝').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:repair:logs').setLabel('Logs').setEmoji('🧾').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:repair:support').setLabel('Support').setEmoji('📨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfgpanel:repair:stats').setLabel('Stats').setEmoji('📊').setStyle(ButtonStyle.Secondary)
    ));
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfgpanel:repair:security').setLabel('Security').setEmoji('🚨').setStyle(ButtonStyle.Secondary)
    ));
  }

  return rows;
}

module.exports = {
  createCommands,
  buildSlashCommands,
  createHelpEmbed,
  createHelpComponents,
  createLogsPanelEmbed,
  createLogsPanelComponents,
  createVoicePanelEmbed,
  createVoicePanelComponents,
  createServerProgressEmbed,
  createServerProgressComponents,
  createDashboardEmbed,
  createDashboardComponents,
  createConfigPanelEmbed,
  createConfigPanelComponents,
  createSupportPanelEmbed,
  createSupportPanelComponents,
  createSupportPromptPayload,
  getHelpTargetInfo
};
