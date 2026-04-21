
require('dotenv').config();

const crypto = require('crypto');
const {
  ActionRowBuilder,
  ActivityType,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require('discord.js');

const { Store } = require('./core/store');
const { createCommands, createHelpEmbed, createHelpComponents, createLogsPanelEmbed, createLogsPanelComponents, createVoicePanelEmbed, createVoicePanelComponents, createServerProgressEmbed, createServerProgressComponents, createDashboardEmbed, createDashboardComponents, createConfigPanelEmbed, createConfigPanelComponents, createSupportPanelEmbed, createSupportPanelComponents, createSupportPromptPayload, createConfessionPanelEmbed, createConfessionPanelComponents, buildCustomizationPayload, getHelpTargetInfo, buildSafeConfigPanelPayload, normalizeConfigPanelPage, quickExamplesForCommand, formatInvalidUsageText } = require('./core/commands');
const {
  ACTIVITY_TYPES,
  baseEmbed,
  ensureHexColor,
  fillTemplate,
  formatDuration,
  normalizeReactionEmoji,
  channelTypeName,
  parseChannelArgument,
  parseRoleArgument,
  parseUserArgument,
  translateText,
  localizePayload,
  normalizeSystemNoticePayload,
  applyGuildPayloadBranding,
  sanitizeActionRows,
  sanitizeModalBuilder,
  sanitizeDiscordPayload
} = require('./core/utils');
const { checkTikTokWatchers } = require('./core/tiktok');
const { DEFAULT_GUILD } = require('./core/defaults');

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const OWNER_IDS = new Set(String(process.env.OWNER_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));
const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || '+';
const AUTO_DEPLOY_COMMANDS = /^(1|true|yes|on)$/i.test(String(process.env.AUTO_DEPLOY_COMMANDS || 'false'));

const SMART_PANEL_THEME_PRESETS = {
  default: '#5865F2',
  emerald: '#10B981',
  sunset: '#F97316',
  neon: '#A855F7'
};

const SMART_TEXT_PRESETS = {
  clean: { mode: 'embed', footer: 'Neyora', color: null, image: null, title: null },
  premium: { mode: 'embed', footer: 'Neyora • premium', color: '#8B5CF6', image: null, titlePrefix: '✦ ' },
  minimal: { mode: 'plain', footer: null, color: null, image: null, title: null }
};

const TRANSIENT_SYSTEM_DELETE_MS = 10_000;

const PREFIX_SHORTCUT_MAP = {
  glist: 'giveaway list',
  glatest: 'giveaway latest',
  gstatus: 'giveaway status',
  gview: 'giveaway view',
  giveawaylist: 'giveaway list',
  giveawaylatest: 'giveaway latest',
  giveawaystatus: 'giveaway status',
  giveawayview: 'giveaway view',
  wconfig: 'welcomeconfig',
  welcomecfg: 'welcomeconfig',
  panelwelcome: 'configpanel welcome',
  panelwelcomedm: 'configpanel welcome-dm',
  panelleave: 'configpanel leave',
  panelleavedm: 'configpanel leave-dm',
  panelboost: 'configpanel boost',
  paneltexts: 'configpanel texts',
  panellogs: 'configpanel logs',
  panelsupport: 'configpanel support',
  panelsecurity: 'configpanel security',
  panelautomation: 'configpanel automation',
  panelstyle: 'configpanel style',
  welcomepanel: 'configpanel welcome',
  welcomedmpanel: 'configpanel welcome-dm',
  leavepanel: 'configpanel leave',
  leavedmpanel: 'configpanel leave-dm',
  boostpanel: 'configpanel boost',
  textspanel: 'configpanel texts',
  supportpanel: 'support panel',
  supportstatus: 'support status',
  supportview: 'support view',
  supportsetup: 'support setup',
  supportrelay: 'support relay',
  supportentry: 'support entry',
  supportrole: 'support role',
  supportpreview: 'support preview',
  supportsend: 'support send',
  supporttest: 'support test',
  supportcheck: 'support check',
  logspanel: 'logs panel',
  logsstatus: 'logs status',
  logsview: 'logs view',
  logsguide: 'logs guide',
  logssetup: 'logs setup',
  logsquicksetup: 'logs quicksetup',
  logstypes: 'logs types',
  logstest: 'logs test',
  logsdefault: 'logs default',
  logsglobal: 'logs global',
  logson: 'logs on',
  logsoff: 'logs off',
  rolesview: 'roles view',
  rolesuser: 'roles user',
  rolesadd: 'roles add',
  rolesremove: 'roles remove',
  rolesmass: 'roles mass',
  rolesall: 'roles all',
  rolespanels: 'roles panels',
  rolesstatus: 'roles statusrole',
  rolesstatusrole: 'roles statusrole',
  rolesautorole: 'roles autorole',
  roleuser: 'roles user',
  roleadd: 'roles add',
  roleremove: 'roles remove',
  rolemass: 'roles mass',
  rolepanels: 'roles panels',
  rolestatus: 'roles statusrole',
  autoroleview: 'autorole view',
  setupcheck: 'setup check',
  setupready: 'setup ready',
  setuptexts: 'setup texts',
  setuplogs: 'setup logs',
  setupsupport: 'setup support',
  setuproles: 'setup roles',
  setupvoice: 'setup voice',
  setupsecurity: 'setup security',
  setupautomation: 'setup automation',
  dashboardlogs: 'dashboard logs',
  dashboardsetup: 'dashboard setup',
  dashboardtools: 'dashboard tools',
  dashboardvoice: 'dashboard voice',
  dashboardsecurity: 'dashboard security',
  trackingstats: 'tracking stats',
  trackinginvites: 'tracking invites',
  trackingleaderboard: 'tracking leaderboard',
  trackinglb: 'tracking leaderboard',
  trackingrefresh: 'tracking refresh',
  voiceview: 'voice view',
  voicepanel: 'voice panel',
  voicecreate: 'voice create',
  voicehubcreate: 'voice create',
  voicemuterole: 'voice muterole',
  voicebanrole: 'voice banrole',
  voiceperms: 'voice perms',
  securityview: 'security view',
  securitypreset: 'security preset',
  securityghostping: 'security ghostping',
  securitycheck: 'security check',
  securitydoctor: 'security doctor',
  securitybypass: 'security bypass',
  securityraid: 'security raid',
  roleslist: 'roles list',
  rolesclean: 'roles clean',
  configdoctor: 'config doctor',
  configexport: 'config export',
  starthelp: 'start',
  customtexts: 'custom texts',
  customsupport: 'custom support',
  customconfessions: 'custom confessions',
  customstyle: 'custom style',
  customstatus: 'custom status',
  custombot: 'custom bot',
  customembed: 'custom embed',
  backupcreate: 'backup create',
  backuplist: 'backup list',
  backuplatest: 'backup latest',
  backupinfo: 'backup info',
  backupload: 'backup load',
  backupexport: 'backup export',
  backupdelete: 'backup delete',
  backupimport: 'backup import',
  tiktoklist: 'tiktok list',
  tiktokadd: 'tiktok add',
  tiktokremove: 'tiktok remove',
  tiktokrole: 'tiktok role',
  tiktokchannel: 'tiktok channel',
  tiktoklive: 'tiktok live',
  tiktokvideo: 'tiktok video',
  tiktoktest: 'tiktok test',
  tiktokcheck: 'tiktok check',
  systemdashboard: 'system dashboard',
  systempanel: 'system panel',
  systemmodules: 'system modules',
  systembackup: 'system backup',
  systemcheck: 'system check',
  infohub: 'info',
  infoshub: 'info',
  utilityhub: 'utility',
  utilhub: 'utility',
  servericon: 'servericon',
  serverbanner: 'serverbanner',
  emojiinfo: 'emojiinfo',
  membercount: 'membercount',
  rolemembers: 'rolemembers',
  textsvars: 'texts vars',
  textsexamples: 'texts examples',
  textswelcome: 'texts welcome',
  textsleave: 'texts leave',
  textsboost: 'texts boost',
  moderationwarn: 'warn',
  moderationtimeout: 'timeout',
  moderationban: 'ban',
  moderationkick: 'kick',
  moderationclear: 'clear',
  mute: 'timeout',
  unmute: 'untimeout',
  bl: 'bl',
  unbl: 'unbl',
  blacklist: 'bl',
  blacklistlist: 'bllist',
  bllist: 'bllist'
};

const FAMILY_SHORTCUT_MAP = {
  support: {
    view: 'view', status: 'status', panel: 'panel', setup: 'setup', relay: 'relay', entry: 'entry', role: 'role', preview: 'preview', send: 'send', test: 'test', check: 'check'
  },
  logs: {
    view: 'view', status: 'status', panel: 'panel', guide: 'guide', start: 'guide', setup: 'setup', quicksetup: 'quicksetup', types: 'types', test: 'test', default: 'default', global: 'global', on: 'on', off: 'off',
    messages: 'messages', members: 'members', moderation: 'moderation', voice: 'voice', server: 'server', social: 'social', join: 'join', leave: 'leave', boost: 'boost', ghostping: 'ghostping'
  },
  roles: {
    view: 'view', list: 'view', user: 'user', member: 'user', add: 'add', remove: 'remove', mass: 'mass', all: 'all', panel: 'panels', panels: 'panels', status: 'statusrole', statusrole: 'statusrole', autorole: 'autorole'
  },
  giveaway: {
    view: 'view', status: 'status', list: 'list', latest: 'latest'
  },
  setup: {
    check: 'check', ready: 'ready', texts: 'texts', logs: 'logs', support: 'support', roles: 'roles', voice: 'voice', security: 'security', automation: 'automation'
  },
  dashboard: {
    home: 'home', setup: 'setup', logs: 'logs', voice: 'voice', security: 'security', automation: 'automation', progress: 'progress', tools: 'tools'
  },
  configpanel: {
    texts: 'texts', welcome: 'welcome', welcomedm: 'welcome-dm', leave: 'leave', leavedm: 'leave-dm', boost: 'boost', logs: 'logs', support: 'support', security: 'security', automation: 'automation', style: 'style'
  },
  tracking: {
    view: 'view', stats: 'stats', invites: 'invites', leaderboard: 'leaderboard', lb: 'leaderboard', refresh: 'refresh'
  },
  voice: {
    view: 'view', panel: 'panel', create: 'create', muterole: 'muterole', banrole: 'banrole', perms: 'perms'
  },
  security: {
    view: 'view', preset: 'preset', ghostping: 'ghostping', check: 'check'
  },
  custom: {
    view: 'home', texts: 'texts', support: 'support', confessions: 'confessions', style: 'style', status: 'status', bot: 'bot', embed: 'embed'
  },
  backup: {
    create: 'create', list: 'list', latest: 'latest', info: 'info', load: 'load', restore: 'load', export: 'export', delete: 'delete', import: 'import'
  },
  texts: {
    view: 'view', welcome: 'welcome', welcomedm: 'welcome', leave: 'leave', leavedm: 'leave', boost: 'boost', vars: 'vars', examples: 'examples'
  },
  system: {
    view: 'view', dashboard: 'dashboard', panel: 'panel', modules: 'modules', backup: 'backup', check: 'check'
  },
  tiktok: {
    view: 'view', list: 'list', add: 'add', remove: 'remove', role: 'role', channel: 'channel', live: 'live', video: 'video', test: 'test', check: 'check'
  },
  info: {
    view: 'view', assets: 'assets', server: 'server', user: 'user', member: 'user', members: 'members', role: 'role', channel: 'channel', boosters: 'boosters'
  },
  utility: {
    view: 'view', create: 'create', text: 'text', fun: 'fun', calc: 'calc', staff: 'staff'
  }
};

function normalizeCommandKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function createNormalizedValueMap(input = {}) {
  const map = new Map();
  for (const [rawKey, rawValue] of Object.entries(input || {})) {
    const key = normalizeCommandKey(rawKey);
    if (key && !map.has(key)) map.set(key, rawValue);
  }
  return map;
}

const NORMALIZED_PREFIX_SHORTCUT_MAP = createNormalizedValueMap(PREFIX_SHORTCUT_MAP);

function resolvePrefixShortcut(rawName) {
  const direct = PREFIX_SHORTCUT_MAP[rawName] || null;
  if (direct) return direct;
  const normalizedName = normalizeCommandKey(rawName);
  if (!normalizedName) return null;
  const normalizedDirect = NORMALIZED_PREFIX_SHORTCUT_MAP.get(normalizedName) || null;
  if (normalizedDirect) return normalizedDirect;
  for (const [root, definitions] of Object.entries(FAMILY_SHORTCUT_MAP)) {
    const rootKey = normalizeCommandKey(root);
    if (!normalizedName.startsWith(rootKey) || normalizedName === rootKey) continue;
    const remainder = normalizedName.slice(rootKey.length);
    const target = definitions[remainder] || null;
    if (target) return `${root} ${target}`;
  }
  return null;
}

function buildVirtualShortcutEntries(prefix) {
  const entries = [];
  const seen = new Set();
  const pushEntry = (shortcut, target) => {
    const key = `${shortcut}=>${target}`;
    if (!shortcut || !target || seen.has(key)) return;
    seen.add(key);
    entries.push({
      shortcut,
      usage: target,
      example: `${prefix}${shortcut}`
    });
  };
  for (const [shortcut, target] of Object.entries(PREFIX_SHORTCUT_MAP)) pushEntry(shortcut, target);
  for (const [root, definitions] of Object.entries(FAMILY_SHORTCUT_MAP)) {
    for (const [shortcut, target] of Object.entries(definitions || {})) pushEntry(`${root}${shortcut}`, `${root} ${target}`);
  }
  return entries;
}

function createPrefixedMessageProxy(message, nextContent) {
  const proxy = Object.create(message);
  proxy.content = nextContent;
  return proxy;
}

function levenshteinDistance(a = '', b = '') {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i + 1;
    for (let j = 0; j < right.length; j += 1) {
      const saved = prev[j + 1];
      const cost = left[i] === right[j] ? 0 : 1;
      prev[j + 1] = Math.min(prev[j + 1] + 1, prev[j] + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return prev[right.length];
}

function scoreCommandGuess(input, candidate) {
  const query = String(input || '').toLowerCase();
  const raw = String(candidate || '').toLowerCase();
  if (!query || !raw) return Number.POSITIVE_INFINITY;
  if (query === raw) return 0;
  if (raw.startsWith(query) || query.startsWith(raw)) return Math.abs(raw.length - query.length) + 0.25;
  if (raw.includes(query) || query.includes(raw)) return Math.abs(raw.length - query.length) + 0.5;
  return levenshteinDistance(query, raw);
}

function resolveRegisteredPrefixCommand(rawName) {
  const input = String(rawName || '').trim().toLowerCase();
  if (!input) return null;
  return client.commandNameMap.get(input)
    || client.commandAliasMap.get(input)
    || client.commandNormalizedMap.get(normalizeCommandKey(input))
    || null;
}

function resolvePrefixCommand(rawName) {
  const direct = resolveRegisteredPrefixCommand(rawName);
  if (direct) return { command: direct, rewrite: null };
  const shortcut = resolvePrefixShortcut(rawName);
  if (!shortcut) return { command: null, rewrite: null };
  const nextName = String(shortcut).trim().split(/\s+/)[0]?.toLowerCase() || '';
  const command = resolveRegisteredPrefixCommand(nextName);
  return command ? { command, rewrite: shortcut } : { command: null, rewrite: null };
}

function getPrefixCommandSuggestions(rawName, prefix, limit = 4) {
  const query = String(rawName || '').trim().toLowerCase();
  if (!query) return [];
  const normalizedQuery = normalizeCommandKey(query);
  const scored = [];
  const seen = new Set();
  const thresholdFor = (value) => Math.max(2, Math.ceil(Math.min(query.length, String(value || '').length) / 3));

  for (const command of client.commandRegistry) {
    const entries = [command.name, ...(command.aliases || [])].filter(Boolean);
    let best = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
      best = Math.min(best, scoreCommandGuess(query, entry), scoreCommandGuess(normalizedQuery, normalizeCommandKey(entry)));
    }
    if (best <= thresholdFor(command.name) && !seen.has(command.name)) {
      seen.add(command.name);
      scored.push({
        key: command.name,
        score: best,
        usage: command.usage || command.name,
        example: quickExamplesForCommand(command, prefix).slice(0, 1)[0] || `${prefix}${command.name}`
      });
    }
  }

  for (const entry of buildVirtualShortcutEntries(prefix)) {
    const best = Math.min(
      scoreCommandGuess(query, entry.shortcut),
      scoreCommandGuess(normalizedQuery, normalizeCommandKey(entry.shortcut)),
      scoreCommandGuess(query, entry.usage.replace(/\s+/g, '')),
      scoreCommandGuess(normalizedQuery, normalizeCommandKey(entry.usage))
    );
    if (best <= thresholdFor(entry.shortcut)) {
      const key = `virtual:${entry.shortcut}`;
      if (!seen.has(key)) {
        seen.add(key);
        scored.push({ key, score: best, usage: entry.usage, example: entry.example });
      }
    }
  }

  return scored
    .sort((a, b) => a.score - b.score || a.usage.localeCompare(b.usage))
    .slice(0, limit)
    .map(({ usage, example }) => ({
      name: usage.split(/\s+/)[0],
      usage,
      example
    }));
}

async function replyUnknownPrefixCommand(message, prefix, rawName) {
  if (!message?.channel?.isTextBased?.()) return false;
  const guildConfig = message.guild ? getGuildConfig(message.guild.id) : { prefix };
  const suggestions = getPrefixCommandSuggestions(rawName, prefix, 4);
  const lines = suggestions.length
    ? suggestions.map((entry) => `• \`${prefix}${entry.usage}\`${entry.example ? ` — ex: \`${entry.example}\`` : ''}`).join('\n')
    : [
        `• \`${prefix}help\``,
        `• \`${prefix}find ${rawName}\``,
        `• \`${prefix}dashboard\``
      ].join('\n');
  const embed = baseEmbed(
    guildConfig,
    uiLangText(guildConfig, '🤔 Commande introuvable', '🤔 Command not found'),
    uiLangText(
      guildConfig,
      `Je ne trouve pas \`${prefix}${rawName}\`. Essaie plutôt :\n\n${lines}`,
      `I could not find \`${prefix}${rawName}\`. Try one of these instead:\n\n${lines}`
    )
  );
  const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
  if (sent) scheduleMessageDelete(sent, TRANSIENT_SYSTEM_DELETE_MS);
  return Boolean(sent);
}

function scheduleMessageDelete(message, delay = TRANSIENT_SYSTEM_DELETE_MS) {
  if (!message || typeof message.delete !== 'function' || !Number.isFinite(delay) || delay <= 0) return;
  setTimeout(() => message.delete().catch(() => null), delay).unref?.();
}

function payloadLooksTransientSystemNotice(payload = {}) {
  return normalizeSystemNoticePayload(payload, null, { defaultDeleteAfter: TRANSIENT_SYSTEM_DELETE_MS }).suggestedDeleteAfter === TRANSIENT_SYSTEM_DELETE_MS;
}

if (!TOKEN)
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

client.meta = {
  clientId: process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '',
  defaultPrefix: DEFAULT_PREFIX
};

client.store = new Store();
client.store.init();
client.commandRegistry = createCommands();
client.commandNameMap = new Map();
client.commandAliasMap = new Map();
client.commandNormalizedMap = new Map();
client.commandMap = new Map();
client.commandRegistry.forEach((command) => {
  const commandName = String(command.name || '').toLowerCase();
  if (!commandName) return;
  client.commandNameMap.set(commandName, command);
  client.commandMap.set(commandName, command);
  const normalizedName = normalizeCommandKey(commandName);
  if (normalizedName && !client.commandNormalizedMap.has(normalizedName)) client.commandNormalizedMap.set(normalizedName, command);
  for (const alias of command.aliases || []) {
    const aliasName = String(alias || '').toLowerCase();
    if (!aliasName) continue;
    if (!client.commandAliasMap.has(aliasName) && !client.commandNameMap.has(aliasName)) client.commandAliasMap.set(aliasName, command);
    if (!client.commandMap.has(aliasName)) client.commandMap.set(aliasName, command);
    const normalizedAlias = normalizeCommandKey(aliasName);
    if (normalizedAlias && !client.commandNormalizedMap.has(normalizedAlias)) client.commandNormalizedMap.set(normalizedAlias, command);
  }
});
client.virtualPrefixEntries = buildVirtualShortcutEntries(DEFAULT_PREFIX);
client.embedDrafts = new Map();
client.snipeCache = new Map();
client.tempBans = new Map();
client.spamTracker = new Map();
client.supportMessageLinks = new Map(Object.entries(client.store.getGlobal().supportLinks || {}));
client.inviteCache = new Map();
client.ghostPingCache = new Map();
client.ghostPingDeleteSeen = new Map();
client.progressRefreshTimers = new Map();
client.autoReactCooldowns = new Map();
client.autoReactRotation = new Map();
client.voiceStatsRefreshTimers = new Map();

function ownerCheck(userId) {
  return OWNER_IDS.has(userId);
}

function getGuildConfig(guildId) {
  return client.store.getGuild(guildId);
}

function uiLangText(guildConfig, fr, en) {
  return String(guildConfig?.language || '').toLowerCase() === 'fr' ? fr : en;
}

function interactionUi(interaction, fr, en) {
  return uiLangText(interaction?.guild ? getGuildConfig(interaction.guild.id) : null, fr, en);
}

function isClearKeyword(raw = '') {
  const value = String(raw || '').trim().toLowerCase();
  return ['clear', 'none', 'null', 'reset', 'remove', 'delete', 'off', 'vide', 'aucun', 'aucune', 'supprimer', 'retirer', '-'].includes(value);
}

function isValidHttpUrl(raw = '') {
  return /^https?:\/\/\S+$/i.test(String(raw || '').trim());
}

function normalizeOptionalModalValue(raw, options = {}) {
  const guildConfig = options.guildConfig || null;
  const field = String(options.field || 'text').toLowerCase();
  const value = String(raw ?? '').trim();
  if (!value || isClearKeyword(value)) return { ok: true, value: null, cleared: true };
  if (field === 'color') {
    const normalized = String(value).startsWith('#') ? String(value) : `#${value}`;
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
      return { ok: false, error: uiLangText(guildConfig, 'Couleur invalide. Utilise un format `#RRGGBB` ou laisse vide pour retirer.', 'Invalid color. Use `#RRGGBB` or leave it blank to clear it.') };
    }
    return { ok: true, value: normalized, cleared: false };
  }
  if (field === 'image' || field === 'thumbnail') {
    if (!isValidHttpUrl(value)) {
      return { ok: false, error: uiLangText(guildConfig, 'URL invalide. Utilise un lien `https://...` ou laisse vide pour retirer.', 'Invalid URL. Use a `https://...` link or leave it blank to clear it.') };
    }
    return { ok: true, value, cleared: false };
  }
  return { ok: true, value, cleared: false };
}

function formatFieldPreview(value, field, guildConfig = null) {
  if (!value) return uiLangText(guildConfig, 'retiré', 'cleared');
  if (field === 'color') return `\`${value}\``;
  const compact = String(value).replace(/\s+/g, ' ').trim();
  return compact.length > 110 ? `${compact.slice(0, 107)}...` : compact;
}

function createSingleFieldModal(guildConfig, customId, options = {}) {
  const title = String(options.title || uiLangText(guildConfig, 'Modifier le champ', 'Edit field')).slice(0, 45);
  const label = String(options.label || uiLangText(guildConfig, 'Valeur', 'Value')).slice(0, 45);
  const value = String(options.value || '').slice(0, options.maxLength || 4000);
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(label)
    .setStyle(options.style || TextInputStyle.Short)
    .setRequired(Boolean(options.required))
    .setMaxLength(options.maxLength || 400)
    .setValue(value);
  if (options.placeholder) input.setPlaceholder(String(options.placeholder).slice(0, 100));
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return sanitizeModalBuilder(modal);
}

function createFieldSavedEmbed(guildConfig, title, options = {}) {
  const lines = [];
  if (options.scope) lines.push(`**${uiLangText(guildConfig, 'Module', 'Module')}:** ${options.scope}`);
  if (options.label) lines.push(`**${uiLangText(guildConfig, 'Champ', 'Field')}:** ${options.label}`);
  lines.push(`**${uiLangText(guildConfig, options.cleared ? 'Action' : 'Valeur', options.cleared ? 'Action' : 'Value')}:** ${options.cleared ? uiLangText(guildConfig, 'retiré', 'cleared') : formatFieldPreview(options.value, options.field, guildConfig)}`);
  if (options.note) lines.push(`**${uiLangText(guildConfig, 'Note', 'Note')}:** ${options.note}`);
  if (Array.isArray(options.next) && options.next.length) {
    lines.push('');
    lines.push(`**${uiLangText(guildConfig, 'Suite', 'Next')}:** ${options.next.join(' • ')}`);
  }
  return baseEmbed(guildConfig, title, lines.join('\n'));
}

function parseFieldUi(moduleLabel, field, guildConfig = null) {
  const safeField = ['title', 'message', 'footer', 'color', 'image', 'thumbnail', 'description', 'author', 'copy'].includes(field) ? field : 'message';
  const labels = {
    title: uiLangText(guildConfig, `${moduleLabel} • titre`, `${moduleLabel} • title`),
    message: uiLangText(guildConfig, `${moduleLabel} • message`, `${moduleLabel} • message`),
    description: uiLangText(guildConfig, `${moduleLabel} • texte`, `${moduleLabel} • text`),
    footer: uiLangText(guildConfig, `${moduleLabel} • footer`, `${moduleLabel} • footer`),
    color: uiLangText(guildConfig, `${moduleLabel} • couleur`, `${moduleLabel} • color`),
    image: uiLangText(guildConfig, `${moduleLabel} • image`, `${moduleLabel} • image`),
    thumbnail: uiLangText(guildConfig, `${moduleLabel} • miniature`, `${moduleLabel} • thumbnail`),
    author: uiLangText(guildConfig, `${moduleLabel} • auteur`, `${moduleLabel} • author`),
    copy: uiLangText(guildConfig, 'Copier un embed', 'Copy an embed')
  };
  const placeholders = {
    title: uiLangText(guildConfig, 'Ex: 👋 Bienvenue sur {server}', 'Example: 👋 Welcome to {server}'),
    message: uiLangText(guildConfig, 'Tu peux utiliser {user}, {server}, {memberCount}...', 'You can use {user}, {server}, {memberCount}...'),
    description: uiLangText(guildConfig, 'Texte principal de l’embed', 'Main embed text'),
    footer: uiLangText(guildConfig, 'Neyora • tape clear pour retirer', 'Neyora • type clear to remove'),
    color: uiLangText(guildConfig, '#5865F2 • tape clear pour retirer', '#5865F2 • type clear to remove'),
    image: uiLangText(guildConfig, 'https://... • tape clear pour retirer', 'https://... • type clear to remove'),
    thumbnail: uiLangText(guildConfig, 'https://... • tape clear pour retirer', 'https://... • type clear to remove'),
    author: uiLangText(guildConfig, 'Nom affiché en haut de l’embed', 'Name shown at the top of the embed'),
    copy: uiLangText(guildConfig, 'ID du message ou lien Discord complet', 'Message ID or full Discord link')
  };
  return {
    field: safeField,
    label: labels[safeField] || moduleLabel,
    placeholder: placeholders[safeField] || uiLangText(guildConfig, 'Valeur', 'Value'),
    style: ['message', 'description'].includes(safeField) ? TextInputStyle.Paragraph : TextInputStyle.Short,
    maxLength: ['message', 'description'].includes(safeField) ? 2000 : 400
  };
}

function parseEmbedFieldUi(field, guildConfig = null) {
  const ui = parseFieldUi(uiLangText(guildConfig, 'Embed', 'Embed'), field, guildConfig);
  if (field === 'copy') {
    ui.style = TextInputStyle.Short;
    ui.maxLength = 200;
  }
  return ui;
}

function parseTextModuleUi(moduleKey, guildConfig = null) {
  const meta = getPanelTextMeta(moduleKey);
  return { meta, scope: uiLangText(guildConfig, meta.label, meta.label) };
}

function parseSupportPreset(config, presetKey) {
  const preset = SMART_TEXT_PRESETS[presetKey] || SMART_TEXT_PRESETS.clean;
  return {
    key: presetKey,
    preset,
    label: presetKey === 'premium' ? 'Premium' : presetKey === 'minimal' ? 'Minimal' : 'Clean'
  };
}

function parseEmbedSourceInput(raw, fallbackChannelId = null) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const linkMatch = value.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d{17,20})/i);
  if (linkMatch) return { guildId: linkMatch[1], channelId: linkMatch[2], messageId: linkMatch[3] };
  const digitGroups = value.match(/\d{17,20}/g) || [];
  if (digitGroups.length >= 2) return { channelId: digitGroups[digitGroups.length - 2], messageId: digitGroups[digitGroups.length - 1] };
  if (digitGroups.length === 1 && fallbackChannelId) return { channelId: fallbackChannelId, messageId: digitGroups[0] };
  return null;
}

async function fetchEmbedSourceMessage(guild, raw, fallbackChannelId = null) {
  const parsed = parseEmbedSourceInput(raw, fallbackChannelId);
  if (!parsed || !guild) return null;
  if (parsed.guildId && parsed.guildId !== guild.id) return null;
  const channel = guild.channels.cache.get(parsed.channelId) || await guild.channels.fetch(parsed.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;
  const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
  if (!message) return null;
  return { channel, message };
}

function buildEmbedDraftPreview(guildConfig, draft) {
  const preview = new EmbedBuilder()
    .setColor(ensureHexColor(draft.embed.color || '#5865F2'))
    .setAuthor({ name: draft.embed.author || (String(guildConfig?.language || '').toLowerCase() === 'fr' ? '✦ Studio embed' : '✦ Embed studio') })
    .setTimestamp()
    .setFooter({ text: draft.embed.footer || (String(guildConfig?.language || '').toLowerCase() === 'fr' ? 'Studio embed • aperçu' : 'Embed studio • preview') });
  if (draft.embed.title) preview.setTitle(draft.embed.title);
  else preview.setTitle(String(guildConfig?.language || '').toLowerCase() === 'fr' ? 'Prévisualisation de l’embed' : 'Embed preview');
  if (draft.embed.description) preview.setDescription(draft.embed.description);
  else preview.setDescription(String(guildConfig?.language || '').toLowerCase() === 'fr' ? 'Crée un embed propre, copie un embed existant puis clique sur **Envoyer** quand tout est prêt.' : 'Add a title, text, image or thumbnail, then click **Send**.');
  if (draft.embed.image) preview.setImage(draft.embed.image);
  if (draft.embed.thumbnail) preview.setThumbnail(draft.embed.thumbnail);
  return preview;
}

function buildEmbedDraftComponents(draftId, guildConfig = null) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embed:title:${draftId}`).setLabel(uiLangText(guildConfig, 'Titre', 'Title')).setEmoji('🏷️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embed:description:${draftId}`).setLabel(uiLangText(guildConfig, 'Texte', 'Text')).setEmoji('📝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embed:author:${draftId}`).setLabel(uiLangText(guildConfig, 'Auteur', 'Author')).setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embed:footer:${draftId}`).setLabel('Footer').setEmoji('🧷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embed:color:${draftId}`).setLabel(uiLangText(guildConfig, 'Couleur', 'Color')).setEmoji('🌈').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embed:image:${draftId}`).setLabel(uiLangText(guildConfig, 'Image', 'Image')).setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embed:thumbnail:${draftId}`).setLabel(uiLangText(guildConfig, 'Miniature', 'Thumbnail')).setEmoji('🪄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embed:copy:${draftId}`).setLabel(uiLangText(guildConfig, 'Copier', 'Copy')).setEmoji('📥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embed:send:${draftId}`).setLabel(uiLangText(guildConfig, 'Envoyer', 'Send')).setEmoji('📤').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`embed:cancel:${draftId}`).setLabel(uiLangText(guildConfig, 'Fermer', 'Close')).setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );
  return sanitizeActionRows([row1, row2]);
}

function importEmbedIntoDraft(draft, sourceEmbed) {
  if (!draft || !sourceEmbed) return draft;
  const colorNumber = typeof sourceEmbed.color === 'number' ? sourceEmbed.color : null;
  draft.embed = {
    color: colorNumber !== null ? `#${colorNumber.toString(16).padStart(6, '0')}` : (draft.embed.color || '#5865F2'),
    title: sourceEmbed.title || null,
    description: sourceEmbed.description || null,
    author: sourceEmbed.author?.name || null,
    footer: sourceEmbed.footer?.text || null,
    image: sourceEmbed.image?.url || null,
    thumbnail: sourceEmbed.thumbnail?.url || null
  };
  return draft;
}

function getMemberPermissionLevel(member) {
  if (!member?.guild) return { levels: [], commands: new Set() };
  const config = getGuildConfig(member.guild.id);
  const levels = [];
  const commands = new Set();
  for (const [level, entry] of Object.entries(config.permissions?.levels || {})) {
    if (!entry?.roleId) continue;
    if (!member.roles.cache.has(entry.roleId)) continue;
    levels.push(level);
    for (const commandName of entry.commands || []) commands.add(String(commandName).toLowerCase());
  }
  return { levels: levels.sort(), commands };
}

function hasCustomCommandAccess(member, command) {
  if (!member || !command) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const info = getMemberPermissionLevel(member);
  return info.commands.has(command.name);
}

function saveSupportLinks() {
  client.store.updateGlobal((global) => {
    global.supportLinks = Object.fromEntries(client.supportMessageLinks.entries());
    return global;
  });
}

async function createTempVoiceChannel(guild, user, panel = {}) {
  const config = getGuildConfig(guild.id);
  const tempConfig = config.voice?.temp || {};
  const parentId = panel?.categoryId || tempConfig.hubCategoryId || null;
  const parent = parentId ? await guild.channels.fetch(parentId).catch(() => null) : null;
  const baseName = `🔊 ${user.username}`.slice(0, 100);
  const channel = await guild.channels.create({
    name: baseName,
    type: ChannelType.GuildVoice,
    parent: parent?.type === ChannelType.GuildCategory ? parent.id : null,
    userLimit: tempConfig.defaultLimit || 0,
    bitrate: tempConfig.defaultBitrate || undefined,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers
        ]
      }
    ]
  }).catch(() => null);
  if (!channel) return null;
  client.store.updateGuild(guild.id, (g) => {
    g.voice = g.voice || { temp: { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null } };
    g.voice.temp = g.voice.temp || { panels: {}, channels: {}, defaultLimit: 0, defaultBitrate: null };
    g.voice.temp.channels[channel.id] = { ownerId: user.id, panelId: panel?.panelId || null, createdAt: Date.now() };
    return g;
  });
  return channel;
}

function getLogRouteKey(type) {
  if (['messageDelete', 'messageEdit', 'ghostPing'].includes(type)) return 'messages';
  if (['memberJoin', 'memberLeave', 'memberUpdate', 'invite', 'boost'].includes(type)) return 'members';
  if (['moderation', 'security', 'giveaway'].includes(type)) return 'moderation';
  if (['voiceJoin', 'voiceLeave', 'voiceMove'].includes(type)) return 'voice';
  if (['roleCreate', 'roleDelete', 'roleUpdate', 'channelCreate', 'channelDelete', 'channelUpdate', 'threadCreate', 'threadDelete', 'serverUpdate'].includes(type)) return 'server';
  if (['support', 'tiktok', 'inviteCreate', 'inviteDelete'].includes(type)) return 'social';
  return 'default';
}

function getTempVoiceEntry(guildId, channelId) {
  if (!guildId || !channelId) return null;
  const config = getGuildConfig(guildId);
  return config.voice?.temp?.channels?.[channelId] || null;
}

function normalizeAnnouncementMode(value) {
  return String(value || 'embed').toLowerCase() === 'plain' ? 'plain' : 'embed';
}

function buildAnnouncementRenderContext(guildConfig, variables = {}, options = {}) {
  return {
    moduleKey: options.moduleKey || 'generic',
    avatarUrl: String(variables.avatarUrl || '').trim(),
    serverIconUrl: String(variables.serverIconUrl || '').trim(),
    serverName: String(variables.server || '').trim(),
    userTag: String(variables.userTag || '').trim(),
    displayName: String(variables.displayName || '').trim(),
    memberCount: Number(variables.memberCount || 0),
    createdAgo: String(variables.createdAgo || '').trim(),
    joinedAgo: String(variables.joinedAgo || '').trim(),
    daysInServer: String(variables.daysInServer || '').trim(),
    joinedDuration: String(variables.joinedDuration || '').trim()
  };
}

function applyRichAnnouncementStyle(guildConfig, embed, render = {}) {
  const moduleKey = String(render.moduleKey || 'generic');
  const avatarUrl = /^https?:\/\//i.test(render.avatarUrl || '') ? render.avatarUrl : null;
  const serverIconUrl = /^https?:\/\//i.test(render.serverIconUrl || '') ? render.serverIconUrl : null;
  const serverName = render.serverName || uiLangText(guildConfig, 'Serveur', 'Server');
  const tag = render.userTag || render.displayName || null;
  const fields = [];

  if (moduleKey === 'welcome') {
    if (serverIconUrl || serverName) embed.setAuthor({ name: uiLangText(guildConfig, `Bienvenue • ${serverName}`, `Welcome • ${serverName}`), iconURL: serverIconUrl || undefined });
    if (avatarUrl) embed.setThumbnail(avatarUrl);
    if (render.memberCount) fields.push({ name: uiLangText(guildConfig, 'Membre', 'Member'), value: `#${render.memberCount}`, inline: true });
    if (render.createdAgo) fields.push({ name: uiLangText(guildConfig, 'Compte', 'Account'), value: render.createdAgo, inline: true });
    if (render.joinedAgo) fields.push({ name: uiLangText(guildConfig, 'Arrivée', 'Joined'), value: render.joinedAgo, inline: true });
  } else if (moduleKey === 'leave') {
    if (serverIconUrl || serverName) embed.setAuthor({ name: uiLangText(guildConfig, `Départ • ${serverName}`, `Leave • ${serverName}`), iconURL: serverIconUrl || undefined });
    if (avatarUrl) embed.setThumbnail(avatarUrl);
    if (render.joinedAgo) fields.push({ name: uiLangText(guildConfig, 'Arrivé', 'Joined'), value: render.joinedAgo, inline: true });
    if (render.joinedDuration || render.daysInServer) fields.push({ name: uiLangText(guildConfig, 'Présence', 'Stayed'), value: render.joinedDuration || `${render.daysInServer}d`, inline: true });
    if (render.memberCount) fields.push({ name: uiLangText(guildConfig, 'Membres', 'Members'), value: String(render.memberCount), inline: true });
  } else if (moduleKey === 'welcome-dm') {
    if (serverIconUrl || serverName) embed.setAuthor({ name: serverName, iconURL: serverIconUrl || undefined });
    if (serverIconUrl) embed.setThumbnail(serverIconUrl);
    else if (avatarUrl) embed.setThumbnail(avatarUrl);
    if (tag) fields.push({ name: uiLangText(guildConfig, 'Profil', 'Profile'), value: tag, inline: true });
    if (render.memberCount) fields.push({ name: uiLangText(guildConfig, 'Membres', 'Members'), value: String(render.memberCount), inline: true });
  } else if (moduleKey === 'leave-dm') {
    if (serverIconUrl || serverName) embed.setAuthor({ name: serverName, iconURL: serverIconUrl || undefined });
    if (serverIconUrl) embed.setThumbnail(serverIconUrl);
    else if (avatarUrl) embed.setThumbnail(avatarUrl);
    if (tag) fields.push({ name: uiLangText(guildConfig, 'Profil', 'Profile'), value: tag, inline: true });
    if (render.memberCount) fields.push({ name: uiLangText(guildConfig, 'Membres', 'Members'), value: String(render.memberCount), inline: true });
  }

  if (fields.length) embed.addFields(fields.slice(0, 3));
}

function createAnnouncementPayload(guildConfig, source, variables, options = {}) {
  const titleKey = options.titleKey || 'title';
  const messageKey = options.messageKey || 'message';
  const modeKey = options.modeKey || 'mode';
  const footerKey = options.footerKey || 'footer';
  const colorKey = options.colorKey || 'color';
  const imageKey = options.imageKey || 'imageUrl';
  const fallbackTitle = options.fallbackTitle || '';
  const message = translateText(fillTemplate(source?.[messageKey] || '', variables).trim(), guildConfig);
  const title = translateText(fillTemplate(source?.[titleKey] || fallbackTitle, variables).trim(), guildConfig);
  const footerRaw = source?.[footerKey];
  const footer = footerRaw === null ? '' : translateText(fillTemplate(footerRaw ?? 'Neyora', variables).trim(), guildConfig);
  const imageUrl = fillTemplate(source?.[imageKey] || '', variables).trim();
  const mode = normalizeAnnouncementMode(source?.[modeKey]);
  if (mode === 'plain') {
    const content = [title ? `**${title}**` : '', message, /^https?:\/\//i.test(imageUrl) ? imageUrl : '']
      .filter(Boolean)
      .join('\n');
    return { content: content || translateText('No content.', guildConfig) };
  }
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(source?.[colorKey] || guildConfig?.embedColor || '#5865F2'))
    .setTimestamp();
  if (title) embed.setTitle(title);
  if (message) embed.setDescription(message);
  applyRichAnnouncementStyle(guildConfig, embed, buildAnnouncementRenderContext(guildConfig, variables, options));
  if (footer) embed.setFooter({ text: footer });
  if (/^https?:\/\//i.test(imageUrl)) embed.setImage(imageUrl);
  return { embeds: [embed] };
}

function getPanelTextMeta(moduleKey = 'welcome') {
  const safe = ['welcome', 'welcome-dm', 'leave', 'leave-dm', 'boost'].includes(moduleKey) ? moduleKey : 'welcome';
  const map = {
    welcome: {
      key: 'welcome',
      label: 'Welcome',
      fallbackTitle: '👋 Welcome',
      rootKey: 'welcome',
      enabledKey: 'enabled',
      channelKey: 'channelId',
      titleKey: 'title',
      messageKey: 'message',
      modeKey: 'mode',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      hasChannel: true
    },
    'welcome-dm': {
      key: 'welcome-dm',
      label: 'Welcome DM',
      fallbackTitle: '👋 Welcome to {server}',
      rootKey: 'welcome',
      enabledKey: 'dmEnabled',
      channelKey: null,
      titleKey: 'dmTitle',
      messageKey: 'dmMessage',
      modeKey: 'dmMode',
      footerKey: 'dmFooter',
      colorKey: 'dmColor',
      imageKey: 'dmImageUrl',
      hasChannel: false
    },
    leave: {
      key: 'leave',
      label: 'Leave',
      fallbackTitle: '👋 Member left',
      rootKey: 'leave',
      enabledKey: 'enabled',
      channelKey: 'channelId',
      titleKey: 'title',
      messageKey: 'message',
      modeKey: 'mode',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      hasChannel: true
    },
    'leave-dm': {
      key: 'leave-dm',
      label: 'Leave DM',
      fallbackTitle: '👋 You left {server}',
      rootKey: 'leave',
      enabledKey: 'dmEnabled',
      channelKey: null,
      titleKey: 'dmTitle',
      messageKey: 'dmMessage',
      modeKey: 'dmMode',
      footerKey: 'dmFooter',
      colorKey: 'dmColor',
      imageKey: 'dmImageUrl',
      hasChannel: false
    },
    boost: {
      key: 'boost',
      label: 'Boost',
      fallbackTitle: '🚀 New boost',
      rootKey: 'boost',
      enabledKey: 'enabled',
      channelKey: 'channelId',
      titleKey: 'title',
      messageKey: 'message',
      modeKey: 'mode',
      footerKey: 'footer',
      colorKey: 'color',
      imageKey: 'imageUrl',
      hasChannel: true
    }
  };
  return map[safe];
}

function getPanelTextVariables(guild, member) {
  const user = member?.user || member;
  const createdTimestamp = user?.createdTimestamp || 0;
  const joinedTimestamp = member?.joinedTimestamp || 0;
  const daysInServer = joinedTimestamp ? Math.max(0, Math.floor((Date.now() - joinedTimestamp) / 86400000)) : 0;
  return {
    user: member?.id ? `<@${member.id}>` : (user?.id ? `<@${user.id}>` : '<@0>'),
    userTag: user?.tag || 'Unknown#0000',
    username: user?.username || user?.tag?.split('#')?.[0] || 'Unknown',
    displayName: member?.displayName || user?.displayName || user?.username || 'Unknown',
    server: guild?.name || 'Server',
    memberCount: guild?.memberCount || 0,
    boostCount: guild?.premiumSubscriptionCount || 0,
    boostTier: guild?.premiumTier || 0,
    createdAt: createdTimestamp ? `<t:${Math.floor(createdTimestamp / 1000)}:F>` : 'unknown',
    createdAgo: createdTimestamp ? `<t:${Math.floor(createdTimestamp / 1000)}:R>` : 'unknown',
    joinedAt: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:F>` : 'unknown',
    joinedAgo: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'unknown',
    createdTimestamp,
    joinedTimestamp,
    daysInServer: String(daysInServer),
    joinedDuration: joinedTimestamp ? formatDuration(Date.now() - joinedTimestamp) : '',
    avatarUrl: member?.displayAvatarURL?.({ extension: 'png', size: 256 }) || user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || '',
    serverIconUrl: guild?.iconURL?.({ extension: 'png', size: 256 }) || ''
  };
}

function getPanelTextSource(guildConfig, moduleKey) {
  const meta = getPanelTextMeta(moduleKey);
  return guildConfig?.[meta.rootKey] || {};
}

function updatePanelTextModule(guild, moduleKey, mutator) {
  const meta = getPanelTextMeta(moduleKey);
  guild[meta.rootKey] = guild[meta.rootKey] || {};
  mutator(guild[meta.rootKey], meta);
  return guild;
}

function resetPanelTextModule(guild, moduleKey) {
  const meta = getPanelTextMeta(moduleKey);
  const defaults = DEFAULT_GUILD[meta.rootKey] || {};
  guild[meta.rootKey] = guild[meta.rootKey] || {};
  if (moduleKey === 'welcome-dm') {
    guild.welcome.dmEnabled = defaults.dmEnabled;
    guild.welcome.dmMode = defaults.dmMode;
    guild.welcome.dmTitle = defaults.dmTitle;
    guild.welcome.dmMessage = defaults.dmMessage;
    guild.welcome.dmFooter = defaults.dmFooter;
    guild.welcome.dmColor = defaults.dmColor;
    guild.welcome.dmImageUrl = defaults.dmImageUrl;
    return guild;
  }
  if (moduleKey === 'leave-dm') {
    guild.leave.dmEnabled = defaults.dmEnabled;
    guild.leave.dmMode = defaults.dmMode;
    guild.leave.dmTitle = defaults.dmTitle;
    guild.leave.dmMessage = defaults.dmMessage;
    guild.leave.dmFooter = defaults.dmFooter;
    guild.leave.dmColor = defaults.dmColor;
    guild.leave.dmImageUrl = defaults.dmImageUrl;
    return guild;
  }
  guild[meta.rootKey].enabled = defaults.enabled;
  guild[meta.rootKey].channelId = defaults.channelId;
  guild[meta.rootKey].title = defaults.title;
  guild[meta.rootKey].message = defaults.message;
  guild[meta.rootKey].mode = defaults.mode;
  guild[meta.rootKey].footer = defaults.footer;
  guild[meta.rootKey].color = defaults.color;
  guild[meta.rootKey].imageUrl = defaults.imageUrl;
  return guild;
}

function buildPanelTextPreviewPayload(guildConfig, moduleKey, guild, user) {
  const meta = getPanelTextMeta(moduleKey);
  const source = getPanelTextSource(guildConfig, moduleKey);
  const variables = getPanelTextVariables(guild, user);
  return createAnnouncementPayload(guildConfig, source, variables, {
    titleKey: meta.titleKey,
    messageKey: meta.messageKey,
    modeKey: meta.modeKey,
    footerKey: meta.footerKey,
    colorKey: meta.colorKey,
    imageKey: meta.imageKey,
    fallbackTitle: meta.fallbackTitle,
    moduleKey
  });
}


function updateSupportPrompt(guild, mutator) {
  guild.support = guild.support || {};
  mutator(guild.support);
  return guild;
}

function resetSupportPrompt(guild) {
  guild.support = guild.support || {};
  const defaults = DEFAULT_GUILD.support || {};
  guild.support.promptMode = defaults.promptMode;
  guild.support.promptTitle = defaults.promptTitle;
  guild.support.promptMessage = defaults.promptMessage;
  guild.support.promptFooter = defaults.promptFooter;
  guild.support.promptColor = defaults.promptColor;
  guild.support.promptImageUrl = defaults.promptImageUrl;
  return guild;
}

async function handleSupportPanelInteraction(interaction) {
  if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
  const config = getGuildConfig(interaction.guild.id);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, 'Panel support', 'Support panel'), uiLangText(config, 'Tu dois avoir Gérer le serveur pour utiliser ce panel.', 'You need Manage Server to use this panel.'))], ephemeral: true }).catch(() => null);
  }

  const parts = interaction.customId.split(':');
  const action = parts[1] || 'refresh';
  const field = parts[2] || null;
  const currentChannel = interaction.channel;
  const refreshPanel = async () => {
    const fresh = getGuildConfig(interaction.guild.id);
    return interaction.message.edit({ embeds: [createSupportPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents(fresh) }).catch(() => null);
  };
  const sendEphemeral = (title, description) => interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), title, description)], ephemeral: true }).catch(() => null);

  if (action === 'refresh') {
    return interaction.update({ embeds: [createSupportPanelEmbed(config, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents(config) });
  }

  if (action === 'toggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.enabled = !guild.support.enabled;
      if (guild.support.enabled && !guild.support.channelId && currentChannel?.isTextBased?.()) guild.support.channelId = currentChannel.id;
      enabled = guild.support.enabled;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📨 Relais support', '📨 Support relay'), uiLangText(getGuildConfig(interaction.guild.id), `Le relais support est maintenant **${enabled ? 'activé' : 'désactivé'}**.`, `Support relay is now **${enabled ? 'enabled' : 'disabled'}**.`));
    return refreshPanel();
  }

  if (action === 'relayhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📨 Panel support', '📨 Support panel'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.enabled = true;
      guild.support.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📨 Relais support', '📨 Support relay'), uiLangText(getGuildConfig(interaction.guild.id), `Le salon relais est maintenant ${currentChannel}.`, `Relay channel set to ${currentChannel}.`));
    return refreshPanel();
  }

  if (action === 'entryhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📨 Panel support', '📨 Support panel'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.entryChannelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📍 Salon support membres', '📍 Support member channel'), uiLangText(getGuildConfig(interaction.guild.id), `Les membres doivent maintenant utiliser ${currentChannel} pour le support.`, `Members should now use ${currentChannel} for support.`));
    return refreshPanel();
  }

  if (action === 'restrict') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.restrictToEntry = !guild.support.restrictToEntry;
      enabled = guild.support.restrictToEntry;
      return guild;
    });
    const fresh = getGuildConfig(interaction.guild.id);
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🚧 Restriction support', '🚧 Support restriction'), enabled ? uiLangText(fresh, `Les membres doivent maintenant utiliser le support dans ${fresh.support?.entryChannelId ? `<#${fresh.support.entryChannelId}>` : 'le salon configuré'}.`, `Members must now use support in ${fresh.support?.entryChannelId ? `<#${fresh.support.entryChannelId}>` : 'the configured support channel'}.`) : uiLangText(fresh, 'Les membres peuvent de nouveau utiliser le support depuis n’importe quel salon.', 'Members can now use support from any channel again.'));
    return refreshPanel();
  }

  if (action === 'only') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.entryCommandOnly = !guild.support.entryCommandOnly;
      if (guild.support.entryCommandOnly && !guild.support.entryChannelId && currentChannel?.isTextBased?.()) guild.support.entryChannelId = currentChannel.id;
      enabled = guild.support.entryCommandOnly;
      return guild;
    });
    const fresh = getGuildConfig(interaction.guild.id);
    await sendEphemeral(uiLangText(fresh, '🧱 Salon réservé', '🧱 Support-only channel'), enabled ? uiLangText(fresh, `Seule la commande \`${client.meta.defaultPrefix || '+'}support\` est autorisée dans ${fresh.support?.entryChannelId ? `<#${fresh.support.entryChannelId}>` : 'le salon membre'}.`, `Only the \`${client.meta.defaultPrefix || '+'}support\` command is allowed in ${fresh.support?.entryChannelId ? `<#${fresh.support.entryChannelId}>` : 'the member channel'}.`) : uiLangText(fresh, 'Le salon membre n’est plus réservé à la commande support.', 'The member channel is no longer locked to the support command.'));
    return refreshPanel();
  }

  if (action === 'mode') {
    let nextMode = 'embed';
    client.store.updateGuild(interaction.guild.id, (guild) => updateSupportPrompt(guild, (support) => {
      nextMode = String(support.promptMode || 'embed').toLowerCase() === 'plain' ? 'embed' : 'plain';
      support.promptMode = nextMode;
    }));
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🎨 Prompt support', '🎨 Support prompt'), uiLangText(getGuildConfig(interaction.guild.id), `Le prompt utilise maintenant le mode **${nextMode === 'plain' ? 'texte' : 'embed'}**.`, `Prompt now uses **${nextMode}** mode.`));
    return refreshPanel();
  }

  if (action === 'reset') {
    client.store.updateGuild(interaction.guild.id, (guild) => resetSupportPrompt(guild));
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '♻️ Prompt support', '♻️ Support prompt'), uiLangText(getGuildConfig(interaction.guild.id), 'Le style du prompt support a été remis par défaut.', 'Support prompt style was reset to default values.'));
    return refreshPanel();
  }

  if (action === 'clear') {
    if (!field || !['entry', 'relay'].includes(field)) return interaction.reply({ content: 'Invalid support panel action.', ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      if (field === 'entry') guild.support.entryChannelId = null;
      if (field === 'relay') guild.support.channelId = null;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🧹 Panel support', '🧹 Support panel'), field === 'entry' ? uiLangText(getGuildConfig(interaction.guild.id), 'Le salon support membres a été retiré.', 'Support member channel cleared.') : uiLangText(getGuildConfig(interaction.guild.id), 'Le salon relais support a été retiré.', 'Support relay channel cleared.'));
    return refreshPanel();
  }

  if (action === 'preview') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetId = fresh.support?.entryChannelId || currentChannel?.id;
    const targetChannel = targetId ? await interaction.guild.channels.fetch(targetId).catch(() => null) : null;
    return interaction.reply({ ...createSupportPromptPayload(fresh, interaction.guild, client.meta.defaultPrefix || '+', targetChannel || currentChannel || null), ephemeral: true }).catch(() => null);
  }

  if (action === 'test') {
    const fresh = getGuildConfig(interaction.guild.id);
    const relayChannelId = fresh.support?.channelId;
    const relayChannel = relayChannelId ? await interaction.guild.channels.fetch(relayChannelId).catch(() => null) : null;
    if (!relayChannel?.isTextBased?.()) {
      return interaction.reply({ embeds: [baseEmbed(fresh, uiLangText(fresh, '🧪 Test support', '🧪 Support test'), uiLangText(fresh, 'Configure d’abord un salon relais support valide.', 'Set a valid support relay channel first.'))], ephemeral: true }).catch(() => null);
    }
    const sent = await relayChannel.send({
      content: fresh.support?.pingRoleId ? `<@&${fresh.support.pingRoleId}>` : null,
      embeds: [baseEmbed(fresh, uiLangText(fresh, '🧪 Test relais support', '🧪 Support relay test'), uiLangText(fresh, 'Message de test du relais support. Le staff peut répondre avec la commande de reply.', 'Support relay test message. Staff can answer with the reply command.'))],
      allowedMentions: { parse: [], roles: fresh.support?.pingRoleId ? [fresh.support.pingRoleId] : [], users: [] }
    }).catch(() => null);
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🧪 Test support', '🧪 Support test'), sent ? uiLangText(fresh, `Test envoyé dans ${relayChannel}.`, `Test sent in ${relayChannel}.`) : uiLangText(fresh, 'Je n’ai pas pu envoyer le test support.', 'I could not send the support test.'));
    return refreshPanel();
  }

  if (action === 'send') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetId = currentChannel?.isTextBased?.() ? currentChannel.id : fresh.support?.entryChannelId;
    const targetChannel = targetId ? await interaction.guild.channels.fetch(targetId).catch(() => null) : null;
    if (!targetChannel?.isTextBased?.()) {
      return interaction.reply({ embeds: [baseEmbed(fresh, uiLangText(fresh, '📨 Prompt support', '📨 Support prompt'), uiLangText(fresh, 'Ouvre ce panel dans le salon support public, ou configure d’abord un salon membre.', 'Open this panel inside the public support channel, or set a member channel first.'))], ephemeral: true }).catch(() => null);
    }
    const payload = createSupportPromptPayload(fresh, interaction.guild, client.meta.defaultPrefix || '+', targetChannel);
    const sent = await targetChannel.send(payload).catch(() => null);
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📤 Prompt support', '📤 Support prompt'), sent ? uiLangText(fresh, `Le prompt support a été envoyé dans ${targetChannel}.`, `Support prompt sent in ${targetChannel}.`) : uiLangText(fresh, 'Je n’ai pas pu envoyer le prompt support.', 'I could not send the support prompt.'));
    return refreshPanel();
  }

  if (action === 'vars') {
    return interaction.reply({
      embeds: [baseEmbed(config, uiLangText(config, '🧩 Variables support', '🧩 Support variables'), [
        '`{server}` → server name',
        '`{prefix}` → current bot prefix',
        '`{supportChannel}` → configured member support channel'
      ].join('\n'))],
      ephemeral: true
    }).catch(() => null);
  }

  if (action === 'preset') {
    const { preset, label } = parseSupportPreset(config, ['clean', 'premium', 'minimal'].includes(field) ? field : 'clean');
    client.store.updateGuild(interaction.guild.id, (guild) => updateSupportPrompt(guild, (support) => {
      support.promptMode = preset.mode;
      const fallbackTitle = DEFAULT_GUILD.support?.promptTitle || support.promptTitle || null;
      support.promptTitle = preset.title !== undefined
        ? preset.title
        : (preset.titlePrefix
            ? `${preset.titlePrefix}${String(support.promptTitle || fallbackTitle || '').replace(/^✦\s*/, '')}`.trim()
            : (support.promptTitle || fallbackTitle || null));
      support.promptFooter = preset.footer;
      support.promptColor = preset.color;
      support.promptImageUrl = preset.image;
    }));
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '✨ Prompt support', '✨ Support prompt'), uiLangText(getGuildConfig(interaction.guild.id), `Preset **${label}** appliqué au prompt support.`, `Preset **${label}** applied to the support prompt.`));
    return refreshPanel();
  }

  if (action === 'edit') {
    const safeField = ['title', 'message', 'footer', 'color', 'image'].includes(field) ? field : 'message';
    const source = config.support || {};
    const keyMap = { title: 'promptTitle', message: 'promptMessage', footer: 'promptFooter', color: 'promptColor', image: 'promptImageUrl' };
    const ui = parseFieldUi(uiLangText(config, 'Prompt support', 'Support prompt'), safeField, config);
    const value = String(source?.[keyMap[safeField]] || '').slice(0, ui.maxLength || 4000);
    return interaction.showModal(createSingleFieldModal(config, `supportpanelmodal:${safeField}`, {
      title: uiLangText(config, `Modifier ${ui.label}`, `Edit ${ui.label}`),
      label: ui.label,
      value,
      placeholder: ui.placeholder,
      style: ui.style,
      maxLength: ui.maxLength,
      required: false
    }));
  }

  return interaction.reply({ content: 'Invalid support panel action.', ephemeral: true }).catch(() => null);
}

async function handleConfigPanelInteraction(interaction) {
  if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
  const config = getGuildConfig(interaction.guild.id);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, 'Smart panel', 'Smart panel'), uiLangText(config, 'Tu dois avoir Gérer le serveur pour utiliser ce panel.', 'You need Manage Server to use this panel.'))], ephemeral: true }).catch(() => null);
  }

  const parts = interaction.customId.split(':');
  const action = parts[1];
  const arg = parts[2] || null;
  const extra = parts[3] || null;
  const currentChannel = interaction.channel;
  const refreshPanel = async (page) => {
    const fresh = getGuildConfig(interaction.guild.id);
    const payload = buildSafeConfigPanelPayload(fresh, interaction.guild, page, currentChannel);
    return interaction.message.edit(payload).catch(() => null);
  };
  const sendEphemeral = (title, description) => interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), title, description)], ephemeral: true }).catch(() => null);

  if (action === 'page' || action === 'refresh' || action === 'jump' || action === 'navrefresh') {
    const page = normalizeConfigPanelPage(arg || 'home');
    return interaction.update(buildSafeConfigPanelPayload(config, interaction.guild, page, currentChannel));
  }

  if (action === 'openlogs') {
    return interaction.update({ embeds: [createLogsPanelEmbed(config, 1)], components: createLogsPanelComponents(config, 1) });
  }

  if (action === 'supportopen') {
    return interaction.update({ embeds: [createSupportPanelEmbed(config, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents(config) });
  }

  if (action === 'securityopen') {
    return interaction.reply({ embeds: [baseEmbed(config, '🚨 Security hub', [
      `Use \`${client.meta.defaultPrefix || '+'}security\` for the full security hub.`,
      `Fast path: \`${client.meta.defaultPrefix || '+'}security ghostping here\` • \`${client.meta.defaultPrefix || '+'}whitelistlist\``
    ].join('\n'))], ephemeral: true }).catch(() => null);
  }

  if (action === 'whitelistview') {
    const users = Array.from(new Set(config.automod?.whitelistUserIds || [])).map((id) => `<@${id}>`);
    const roles = Array.from(new Set(config.automod?.whitelistRoleIds || [])).map((id) => `<@&${id}>`);
    return interaction.reply({ embeds: [baseEmbed(config, '✅ Whitelist', [
      `**Users:** ${users.length ? users.join(', ') : 'none'}`,
      `**Roles:** ${roles.length ? roles.join(', ') : 'none'}`
    ].join('\n').slice(0, 4000))], ephemeral: true }).catch(() => null);
  }

  if (action === 'repair') {
    const scope = ['all', 'texts', 'logs', 'support', 'stats', 'security'].includes(arg) ? arg : 'all';
    const report = await client.repairGuildConfiguration(interaction.guild, scope);
    await sendEphemeral('🩺 Recovery', [
      `**Scope:** ${report.scope}`,
      `**Fixed:** ${report.fixed.length}`,
      `**Cleared:** ${report.cleared.length}`,
      `**Notes:** ${report.notes.length}`,
      report.fixed.length ? '' : null,
      ...report.fixed.slice(0, 6).map((line) => `• ${line}`),
      ...report.cleared.slice(0, 6).map((line) => `• ${line}`),
      ...report.notes.slice(0, 6).map((line) => `• ${line}`)
    ].filter(Boolean).join('\n'));
    return refreshPanel('home');
  }

  if (action === 'textvars') {
    return interaction.reply({
      embeds: [baseEmbed(config, '🧩 Text variables', [
        '`{user}` → member mention',
        '`{userTag}` → full username',
        '`{server}` → server name',
        '`{memberCount}` → member count',
        '`{boostCount}` → boost count',
        '`{boostTier}` → boost tier'
      ].join('\n'))],
      ephemeral: true
    }).catch(() => null);
  }

  if (action === 'textview') {
    const page = normalizeConfigPanelPage(arg || 'welcome');
    return interaction.update(buildSafeConfigPanelPayload(config, interaction.guild, page, currentChannel));
  }

  if (action === 'texttoggle' || action === 'texthere' || action === 'textmode' || action === 'texttest' || action === 'textreset' || action === 'textedit') {
    const moduleKey = arg || 'welcome';
    const meta = getPanelTextMeta(moduleKey);

    if (action === 'texttest') {
      const payload = buildPanelTextPreviewPayload(config, moduleKey, interaction.guild, interaction.user);
      return interaction.reply({ ...payload, ephemeral: true }).catch(() => null);
    }

    if (action === 'textedit') {
      const source = getPanelTextSource(config, moduleKey);
      const field = extra || 'message';
      const keyMap = {
        title: meta.titleKey,
        message: meta.messageKey,
        footer: meta.footerKey,
        color: meta.colorKey,
        image: meta.imageKey
      };
      const targetKey = keyMap[field] || meta.messageKey;
      const ui = parseFieldUi(meta.label, field, config);
      const value = String(source?.[targetKey] || '').slice(0, ui.maxLength || 4000);
      return interaction.showModal(createSingleFieldModal(config, `cfgpanelmodal:${moduleKey}:${field}`, {
        title: uiLangText(config, `Modifier ${ui.label}`, `Edit ${ui.label}`),
        label: ui.label,
        value,
        placeholder: ui.placeholder,
        style: ui.style,
        maxLength: ui.maxLength,
        required: false
      }));
    }

    if (action === 'textreset') {
      client.store.updateGuild(interaction.guild.id, (guild) => resetPanelTextModule(guild, moduleKey));
      await sendEphemeral('♻️ Text reset', `${meta.label} style was reset to the default values.`);
      return refreshPanel(moduleKey);
    }

    if (action === 'texthere') {
      if (!meta.hasChannel) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📝 Panel textes', '📝 Text panel'), uiLangText(config, 'Ce module envoie en MP, pas dans un salon du serveur.', 'This module sends in DMs, not in a server channel.'))], ephemeral: true }).catch(() => null);
      if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📝 Panel textes', '📝 Text panel'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
      client.store.updateGuild(interaction.guild.id, (guild) => updatePanelTextModule(guild, moduleKey, (target) => {
        target[meta.enabledKey] = true;
        target[meta.channelKey] = currentChannel.id;
      }));
      await sendEphemeral('📍 Channel bound', `${meta.label} will now send in ${currentChannel}.`);
      return refreshPanel(moduleKey);
    }

    if (action === 'texttoggle') {
      let nextEnabled = false;
      client.store.updateGuild(interaction.guild.id, (guild) => updatePanelTextModule(guild, moduleKey, (target) => {
        nextEnabled = !target[meta.enabledKey];
        target[meta.enabledKey] = nextEnabled;
        if (nextEnabled && meta.hasChannel && !target[meta.channelKey] && currentChannel?.isTextBased?.()) target[meta.channelKey] = currentChannel.id;
      }));
      await sendEphemeral('✅ Text module', `${meta.label} is now **${nextEnabled ? 'enabled' : 'disabled'}**.`);
      return refreshPanel(moduleKey);
    }

    if (action === 'textmode') {
      let nextMode = 'embed';
      client.store.updateGuild(interaction.guild.id, (guild) => updatePanelTextModule(guild, moduleKey, (target) => {
        nextMode = String(target[meta.modeKey] || 'embed').toLowerCase() === 'plain' ? 'embed' : 'plain';
        target[meta.modeKey] = nextMode;
      }));
      await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🎨 Mode du texte', '🎨 Text mode'), uiLangText(getGuildConfig(interaction.guild.id), `${meta.label} utilise maintenant le mode **${nextMode === 'plain' ? 'texte' : 'embed'}**.`, `${meta.label} now uses **${nextMode}** mode.`));
      return refreshPanel(moduleKey);
    }
  }


  if (action === 'textpreset') {
    const moduleKey = arg || 'welcome';
    const presetKey = ['clean', 'premium', 'minimal'].includes(extra) ? extra : 'clean';
    const metaMap = {
      welcome: { root: 'welcome', enabledKey: 'enabled', modeKey: 'mode', titleKey: 'title', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl', channelKey: 'channelId' },
      'welcome-dm': { root: 'welcome', enabledKey: 'dmEnabled', modeKey: 'dmMode', titleKey: 'dmTitle', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl', channelKey: null },
      leave: { root: 'leave', enabledKey: 'enabled', modeKey: 'mode', titleKey: 'title', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl', channelKey: 'channelId' },
      'leave-dm': { root: 'leave', enabledKey: 'dmEnabled', modeKey: 'dmMode', titleKey: 'dmTitle', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl', channelKey: null },
      boost: { root: 'boost', enabledKey: 'enabled', modeKey: 'mode', titleKey: 'title', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl', channelKey: 'channelId' }
    };
    const meta = metaMap[moduleKey] || metaMap.welcome;
    const preset = SMART_TEXT_PRESETS[presetKey] || SMART_TEXT_PRESETS.clean;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild[meta.root] = guild[meta.root] || JSON.parse(JSON.stringify(DEFAULT_GUILD[meta.root] || {}));
      const target = guild[meta.root];
      target[meta.enabledKey] = true;
      if (meta.channelKey && !target[meta.channelKey] && currentChannel?.isTextBased?.()) target[meta.channelKey] = currentChannel.id;
      target[meta.modeKey] = preset.mode;
      const fallbackTitle = DEFAULT_GUILD[meta.root]?.[meta.titleKey] || target[meta.titleKey] || null;
      target[meta.titleKey] = preset.title !== undefined ? preset.title : (preset.titlePrefix ? `${preset.titlePrefix}${String(target[meta.titleKey] || fallbackTitle || '').replace(/^✦\s*/, '')}`.trim() : (target[meta.titleKey] || fallbackTitle || null));
      target[meta.footerKey] = preset.footer;
      target[meta.colorKey] = preset.color;
      target[meta.imageKey] = preset.image;
      return guild;
    });
    await sendEphemeral('✨ Text preset', `Preset **${presetKey}** applied to **${moduleKey}**.`);
    return refreshPanel(moduleKey);
  }

  if (action === 'theme') {
    const presetKey = arg in SMART_PANEL_THEME_PRESETS ? arg : 'default';
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.embedColor = SMART_PANEL_THEME_PRESETS[presetKey] || SMART_PANEL_THEME_PRESETS.default;
      guild.panel = guild.panel || {};
      guild.panel.theme = presetKey;
      return guild;
    });
    await sendEphemeral('🎨 Theme', `Theme **${presetKey}** applied.`);
    return refreshPanel('style');
  }

  if (action === 'deploy') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📌 Smart panel', '📌 Smart panel'), uiLangText(config, 'Ouvre le panel dans un salon texte d’abord.', 'Open the panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    const sent = await currentChannel.send({ embeds: [createConfigPanelEmbed(getGuildConfig(interaction.guild.id), interaction.guild, 'home', currentChannel)], components: createConfigPanelComponents('home', currentChannel.id, getGuildConfig(interaction.guild.id)) }).catch(() => null);
    if (!sent) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📌 Smart panel', '📌 Smart panel'), uiLangText(config, 'Je n’ai pas pu déployer le panel dans ce salon.', 'I could not deploy the panel in this channel.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.panel = guild.panel || {};
      guild.panel.deployedChannelId = currentChannel.id;
      guild.panel.deployedMessageId = sent.id;
      guild.panel.lastDeployedAt = Date.now();
      return guild;
    });
    return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📌 Smart panel', '📌 Smart panel'), uiLangText(getGuildConfig(interaction.guild.id), `Centre de contrôle déployé dans ${currentChannel}. Épingle ce message pour le staff.`, `Control center deployed in ${currentChannel}. Pin that message for staff.`))], ephemeral: true }).catch(() => null);
  }

  if (action === 'supporttoggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.enabled = !guild.support.enabled;
      if (guild.support.enabled && !guild.support.channelId && currentChannel?.isTextBased?.()) guild.support.channelId = currentChannel.id;
      enabled = guild.support.enabled;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📨 Relais support', '📨 Support relay'), uiLangText(getGuildConfig(interaction.guild.id), `Le relais support est maintenant **${enabled ? 'activé' : 'désactivé'}**.`, `Support relay is now **${enabled ? 'enabled' : 'disabled'}**.`));
    return refreshPanel('support');
  }

  if (action === 'supportrelayhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📨 Support', '📨 Support'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.enabled = true;
      guild.support.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📨 Relais support', '📨 Support relay'), uiLangText(getGuildConfig(interaction.guild.id), `Le salon relais est maintenant ${currentChannel}.`, `Relay channel set to ${currentChannel}.`));
    return refreshPanel('support');
  }

  if (action === 'supportentryhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📨 Support', '📨 Support'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.entryChannelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('📍 Support entry', uiLangText(getGuildConfig(interaction.guild.id), `Les membres doivent utiliser ${currentChannel} pour \`${client.meta.defaultPrefix || '+'}support\`.`, `Members should use ${currentChannel} for \`${client.meta.defaultPrefix || '+'}support\`.`));
    return refreshPanel('support');
  }

  if (action === 'supportrestrict') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.restrictToEntry = !guild.support.restrictToEntry;
      enabled = guild.support.restrictToEntry;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🚧 Restriction support', '🚧 Support restriction'), enabled ? uiLangText(getGuildConfig(interaction.guild.id), 'Les membres sont maintenant limités au salon support configuré.', 'Members are now restricted to the configured support channel.') : uiLangText(getGuildConfig(interaction.guild.id), 'Les membres peuvent de nouveau utiliser le support depuis n’importe quel salon.', 'Members can now use support from any channel again.'));
    return refreshPanel('support');
  }

  if (action === 'supportonly') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false, entryCommandOnly: false };
      guild.support.entryCommandOnly = !guild.support.entryCommandOnly;
      if (guild.support.entryCommandOnly && !guild.support.entryChannelId && currentChannel?.isTextBased?.()) guild.support.entryChannelId = currentChannel.id;
      enabled = guild.support.entryCommandOnly;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🧱 Salon réservé', '🧱 Support-only channel'), enabled ? uiLangText(getGuildConfig(interaction.guild.id), 'Le salon membre est maintenant réservé à la commande support.', 'The member channel is now reserved to the support command.') : uiLangText(getGuildConfig(interaction.guild.id), 'Le salon membre n’est plus réservé à la commande support.', 'The member channel is no longer reserved to the support command.'));
    return refreshPanel('support');
  }

  if (action === 'supportsend') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetId = fresh.support?.entryChannelId || currentChannel?.id;
    const targetChannel = targetId ? (interaction.guild.channels.cache.get(targetId) || await interaction.guild.channels.fetch(targetId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(fresh, uiLangText(fresh, '📨 Prompt support', '📨 Support prompt'), uiLangText(fresh, 'Configure d’abord un salon support membres valide.', 'Set a valid support member channel first.'))], ephemeral: true }).catch(() => null);
    const payload = createSupportPromptPayload(fresh, interaction.guild, client.meta.defaultPrefix || '+', targetChannel);
    const sent = await targetChannel.send(payload).catch(() => null);
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📤 Prompt support', '📤 Support prompt'), sent ? uiLangText(fresh, `Le prompt support a été envoyé dans ${targetChannel}.`, `Support prompt sent in ${targetChannel}.`) : uiLangText(fresh, 'Je n’ai pas pu envoyer le prompt support.', 'I could not send the support prompt.'));
    return refreshPanel('support');
  }

  if (action === 'logtoggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.logs = guild.logs || { enabled: false, channelId: null, channels: {}, types: {} };
      guild.logs.enabled = !guild.logs.enabled;
      enabled = guild.logs.enabled;
      if (enabled && !guild.logs.channels?.default && currentChannel?.isTextBased?.()) {
        guild.logs.channels = guild.logs.channels || {};
        guild.logs.channels.default = currentChannel.id;
        guild.logs.channelId = currentChannel.id;
      }
      return guild;
    });
    await sendEphemeral('🧾 Logs', `Logs are now **${enabled ? 'enabled' : 'disabled'}**.`);
    return refreshPanel('logs');
  }

  if (action === 'ghosttoggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.automod = guild.automod || {};
      guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
      guild.automod.ghostPing.enabled = !guild.automod.ghostPing.enabled;
      if (!guild.automod.ghostPing.channelId && currentChannel?.isTextBased?.()) guild.automod.ghostPing.channelId = currentChannel.id;
      enabled = guild.automod.ghostPing.enabled;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '👻 Ghost ping', '👻 Ghost ping'), uiLangText(getGuildConfig(interaction.guild.id), `Le ghost ping est maintenant **${enabled ? 'activé' : 'désactivé'}**.${enabled && currentChannel?.isTextBased?.() ? `\nSalon : ${currentChannel}` : ''}`, `Ghost ping is now **${enabled ? 'enabled' : 'disabled'}**.${enabled && currentChannel?.isTextBased?.() ? `\nChannel: ${currentChannel}` : ''}`));
    return refreshPanel('security');
  }

  if (action === 'ghosthere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '👻 Ghost ping', '👻 Ghost ping'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.automod = guild.automod || {};
      guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
      guild.automod.ghostPing.enabled = true;
      guild.automod.ghostPing.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '👻 Ghost ping', '👻 Ghost ping'), uiLangText(getGuildConfig(interaction.guild.id), `Les membres qui rejoignent seront ping dans ${currentChannel}, puis le message sera supprimé après 2 secondes.`, `Joining members will be pinged in ${currentChannel}, then the message will delete after 2 seconds.`));
    return refreshPanel('security');
  }

  if (action === 'ghosttest') {
    const fresh = getGuildConfig(interaction.guild.id);
    const testChannelId = fresh.automod?.ghostPing?.channelId || currentChannel?.id;
    const testChannel = testChannelId ? (interaction.guild.channels.cache.get(testChannelId) || await interaction.guild.channels.fetch(testChannelId).catch(() => null)) : null;
    if (!testChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(fresh, uiLangText(fresh, '👻 Test ghost ping', '👻 Ghost ping test'), uiLangText(fresh, 'Aucun salon ghost ping valide n’est encore configuré. Utilise d’abord **Ghost ici**.', 'No valid ghost ping channel is configured yet. Use **Ghost here** first.'))], ephemeral: true }).catch(() => null);
    const me = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
    const perms = testChannel.permissionsFor(me);
    const canSend = perms?.has(PermissionFlagsBits.SendMessages);
    let sent = false;
    try {
      if (canSend) {
        const probe = await testChannel.send({ content: `<@${interaction.user.id}>`, allowedMentions: { users: [interaction.user.id], roles: [], parse: [], repliedUser: false } });
        if (probe) setTimeout(() => probe.delete().catch(() => null), 2_000).unref?.();
        sent = true;
      }
    } catch (error) {
      sent = false;
    }
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '👻 Test ghost ping', '👻 Ghost ping test'), sent ? uiLangText(fresh, `Test ping envoyé dans ${testChannel}. Il sera supprimé après 2 secondes.`, `Test ping sent in ${testChannel}. It will delete after 2 seconds.`) : uiLangText(fresh, `Je n’ai pas pu envoyer un test ping dans ${testChannel}. Vérifie **Envoyer des messages**.`, `I could not send a test ping in ${testChannel}. Check **Send Messages**.`));
    return refreshPanel('home');
  }

  if (action === 'logshere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '🧾 Logs', '🧾 Logs'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.logs = guild.logs || { enabled: false, channelId: null, channels: {}, types: {} };
      guild.logs.enabled = true;
      guild.logs.channelId = currentChannel.id;
      guild.logs.channels = guild.logs.channels || {};
      guild.logs.channels.default = currentChannel.id;
      return guild;
    });
    await sendEphemeral('🧾 Logs', `Default logs channel set to ${currentChannel}.`);
    return refreshPanel('logs');
  }

  if (action === 'trophyhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '🏆 Trophy board', '🏆 Trophy board'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
      guild.progress.enabled = true;
      guild.progress.channelId = currentChannel.id;
      guild.progress.lastUpdatedAt = Date.now();
      return guild;
    });
    await refreshProgressBoard(interaction.guild, { createIfMissing: true });
    await sendEphemeral('🏆 Trophy board', `Progress board is now linked to ${currentChannel}.`);
    return refreshPanel('home');
  }

  if (action === 'artoggle' || action === 'arhype' || action === 'aroff') {
    const targetChannelId = arg && arg !== '0' ? arg : currentChannel?.id;
    const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '⚡ Auto-react', '⚡ Auto-react'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    let note = '';
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.autoReact = guild.autoReact || { channels: {} };
      guild.autoReact.channels = guild.autoReact.channels || {};
      const current = guild.autoReact.channels[targetChannel.id] || {};
      const existingEmojis = Array.isArray(current.emojis) ? current.emojis.filter(Boolean) : [];
      if (action === 'aroff') {
        guild.autoReact.channels[targetChannel.id] = { ...current, enabled: false };
        note = `Auto-react disabled in ${targetChannel}.`;
      } else if (action === 'arhype') {
        guild.autoReact.channels[targetChannel.id] = {
          ...current,
          enabled: true,
          emojis: ['🔥', '😂', '💥', '⚡'],
          mode: 'rotate',
          maxReactions: 2,
          chance: 100,
          cooldownSeconds: 10,
          allowBots: false,
          ignoreCommands: true,
          triggerWords: []
        };
        note = `Preset **hype** applied in ${targetChannel}.`;
      } else {
        const nextEnabled = !(current.enabled !== false && existingEmojis.length > 0);
        guild.autoReact.channels[targetChannel.id] = {
          ...current,
          enabled: nextEnabled,
          emojis: existingEmojis.length ? existingEmojis : ['🔥', '😂'],
          mode: current.mode || 'rotate',
          maxReactions: Math.max(1, Number(current.maxReactions) || 1),
          chance: Math.max(1, Number(current.chance) || 100),
          cooldownSeconds: Math.max(0, Number(current.cooldownSeconds) || 10),
          allowBots: Boolean(current.allowBots),
          ignoreCommands: current.ignoreCommands !== false,
          triggerWords: Array.isArray(current.triggerWords) ? current.triggerWords : []
        };
        note = `Auto-react is now **${nextEnabled ? 'enabled' : 'disabled'}** in ${targetChannel}.`;
      }
      return guild;
    });
    await sendEphemeral('⚡ Auto-react', note);
    return refreshPanel('automation');
  }

  if (action === 'stickyset') {
    const targetChannelId = arg && arg !== '0' ? arg : currentChannel?.id;
    const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📌 Sticky', '📌 Sticky'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    const currentSticky = getGuildConfig(interaction.guild.id).sticky?.[targetChannel.id]?.message || '';
    return interaction.showModal(createSingleFieldModal(config, `cfgpanelsticky:${targetChannel.id}`, {
      title: uiLangText(config, 'Modifier sticky', 'Edit sticky'),
      label: uiLangText(config, `Sticky pour #${targetChannel.name}`, `Sticky for #${targetChannel.name}`),
      value: String(currentSticky).slice(0, 2000),
      placeholder: uiLangText(config, 'Message renvoyé automatiquement dans ce salon', 'Message reposted automatically in this channel'),
      style: TextInputStyle.Paragraph,
      maxLength: 2000,
      required: false
    }));
  }

  if (action === 'stickyoff') {
    const targetChannelId = arg && arg !== '0' ? arg : currentChannel?.id;
    const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '📌 Sticky', '📌 Sticky'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.sticky = guild.sticky || {};
      delete guild.sticky[targetChannel.id];
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📌 Sticky', '📌 Sticky'), uiLangText(getGuildConfig(interaction.guild.id), `Sticky désactivé dans ${targetChannel}.`, `Sticky message disabled in ${targetChannel}.`));
    return refreshPanel('automation');
  }

  if (action === 'statsmembers' || action === 'statsonline' || action === 'statsvoice') {
    const type = action === 'statsmembers' ? 'members' : action === 'statsonline' ? 'online' : 'voice';
    return interaction.reply({
      embeds: [baseEmbed(config, uiLangText(config, '📊 Liaison stats', '📊 Stats bind'), uiLangText(config, `Choisis le salon vocal à utiliser pour **${type}**.`, `Select the voice channel to use for **${type}**.`))],
      components: [
        new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(`cfgpanelstats:${type}`)
            .setPlaceholder(uiLangText(config, `Choisis un salon vocal pour ${type}`, `Select a voice channel for ${type}`))
            .setMinValues(1)
            .setMaxValues(1)
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        )
      ],
      ephemeral: true
    }).catch(() => null);
  }

  return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, 'Smart panel', 'Smart panel'), uiLangText(config, 'Action inconnue.', 'Unknown action.'))] , ephemeral: true }).catch(() => null);
}



async function handleConfessionPanelInteraction(interaction) {
  if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
  const config = getGuildConfig(interaction.guild.id);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, 'Panneau confessions', 'Confessions panel'), uiLangText(config, 'Tu dois avoir Gérer le serveur pour utiliser ce panel.', 'You need Manage Server to use this panel.'))], ephemeral: true }).catch(() => null);
  }

  const parts = interaction.customId.split(':');
  const action = parts[1] || 'refresh';
  const field = parts[2] || null;
  const currentChannel = interaction.channel;
  const refreshPanel = async () => {
    const fresh = getGuildConfig(interaction.guild.id);
    return interaction.message.edit({ embeds: [createConfessionPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createConfessionPanelComponents(fresh) }).catch(() => null);
  };
  const sendEphemeral = (title, description) => interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), title, description)], ephemeral: true }).catch(() => null);

  if (action === 'refresh') {
    return interaction.update({ embeds: [createConfessionPanelEmbed(config, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createConfessionPanelComponents(config) });
  }

  if (action === 'toggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
      guild.confessions.enabled = !guild.confessions.enabled;
      if (guild.confessions.enabled && !guild.confessions.channelId && currentChannel?.isTextBased?.()) guild.confessions.channelId = currentChannel.id;
      enabled = guild.confessions.enabled;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🤫 Confessions', '🤫 Confessions'), uiLangText(getGuildConfig(interaction.guild.id), `Le module est maintenant **${enabled ? 'activé' : 'désactivé'}**.`, `The module is now **${enabled ? 'enabled' : 'disabled'}**.`));
    return refreshPanel();
  }

  if (action === 'channelhere' || action === 'logshere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, '🤫 Confessions', '🤫 Confessions'), uiLangText(config, 'Ouvre ce panel dans un salon texte d’abord.', 'Open this panel inside a text channel first.'))], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
      if (action === 'channelhere') {
        guild.confessions.channelId = currentChannel.id;
        guild.confessions.enabled = true;
      } else {
        guild.confessions.logChannelId = currentChannel.id;
      }
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🤫 Confessions', '🤫 Confessions'), action === 'channelhere' ? uiLangText(getGuildConfig(interaction.guild.id), `Le salon public est maintenant ${currentChannel}.`, `The public confession channel is now ${currentChannel}.`) : uiLangText(getGuildConfig(interaction.guild.id), `Le salon logs est maintenant ${currentChannel}.`, `The confession log channel is now ${currentChannel}.`));
    return refreshPanel();
  }

  if (action === 'attachments') {
    let allowed = true;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
      guild.confessions.allowAttachments = guild.confessions.allowAttachments === false;
      allowed = guild.confessions.allowAttachments !== false;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '📎 Confessions', '📎 Confessions'), allowed ? uiLangText(getGuildConfig(interaction.guild.id), 'Les pièces jointes sont maintenant autorisées.', 'Attachments are now allowed.') : uiLangText(getGuildConfig(interaction.guild.id), 'Les pièces jointes sont maintenant désactivées.', 'Attachments are now disabled.'));
    return refreshPanel();
  }

  if (action === 'badges') {
    let enabled = true;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
      guild.confessions.showBadges = guild.confessions.showBadges === false;
      enabled = guild.confessions.showBadges !== false;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🏷️ Confessions', '🏷️ Confessions'), enabled ? uiLangText(getGuildConfig(interaction.guild.id), 'Les badges visuels sont maintenant activés.', 'Visual badges are now enabled.') : uiLangText(getGuildConfig(interaction.guild.id), 'Les badges visuels sont maintenant désactivés.', 'Visual badges are now disabled.'));
    return refreshPanel();
  }

  if (action === 'clear') {
    if (!field || !['channel', 'logs'].includes(field)) return interaction.reply({ content: 'Invalid confession panel action.', ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
      if (field === 'channel') guild.confessions.channelId = null;
      if (field === 'logs') guild.confessions.logChannelId = null;
      return guild;
    });
    await sendEphemeral(uiLangText(getGuildConfig(interaction.guild.id), '🧹 Confessions', '🧹 Confessions'), field === 'channel' ? uiLangText(getGuildConfig(interaction.guild.id), 'Le salon public a été retiré.', 'The public confession channel was cleared.') : uiLangText(getGuildConfig(interaction.guild.id), 'Le salon logs a été retiré.', 'The confession log channel was cleared.'));
    return refreshPanel();
  }

  if (action === 'test') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetChannel = fresh.confessions?.channelId ? await interaction.guild.channels.fetch(fresh.confessions.channelId).catch(() => null) : null;
    if (!targetChannel?.isTextBased?.()) {
      return interaction.reply({ embeds: [baseEmbed(fresh, uiLangText(fresh, '🤫 Confessions', '🤫 Confessions'), uiLangText(fresh, 'Définis d’abord un salon public pour les confessions.', 'Set a public confession channel first.'))], ephemeral: true }).catch(() => null);
    }
    const preview = baseEmbed(fresh, fresh.confessions?.title || uiLangText(fresh, '🤫 Confession anonyme', '🤫 Anonymous confession'), uiLangText(fresh, 'Aperçu du rendu : une confession anonyme propre et discrète.', 'Preview look: a clean and discreet anonymous confession.')).setColor(ensureHexColor(fresh.confessions?.color || DEFAULT_GUILD.confessions?.color || '#EC4899')).setFooter({ text: uiLangText(fresh, 'Confession #DEMO • anonyme', 'Confession #DEMO • anonymous') });
    const sent = await targetChannel.send({ embeds: [preview], components: [], allowedMentions: { parse: [] } }).catch(() => null);
    await sendEphemeral(uiLangText(fresh, '🧪 Test confessions', '🧪 Confessions test'), sent ? uiLangText(fresh, `Aperçu envoyé dans ${targetChannel}.`, `Preview sent in ${targetChannel}.`) : uiLangText(fresh, 'Je n’ai pas pu envoyer l’aperçu.', 'I could not send the preview.'));
    return refreshPanel();
  }

  if (action === 'edit') {
    const safeField = ['title', 'color'].includes(field) ? field : 'title';
    const source = config.confessions || {};
    const ui = parseFieldUi(uiLangText(config, 'Confessions', 'Confessions'), safeField, config);
    const value = String(source?.[safeField] || '').slice(0, ui.maxLength || 4000);
    return interaction.showModal(createSingleFieldModal(config, `confessionpanelmodal:${safeField}`, {
      title: uiLangText(config, `Modifier ${ui.label}`, `Edit ${ui.label}`),
      label: ui.label,
      value,
      placeholder: safeField === 'color' ? uiLangText(config, '#EC4899 • tape clear pour retirer', '#EC4899 • type clear to clear it') : uiLangText(config, 'Ex: 🤫 Confession anonyme', 'Example: 🤫 Anonymous confession'),
      style: TextInputStyle.Short,
      maxLength: safeField === 'title' ? 200 : 100,
      required: false
    }));
  }

  return interaction.reply({ content: 'Unknown action.', ephemeral: true }).catch(() => null);
}

async function getManagedTempVoiceState(interaction, options = {}) {
  const member = interaction.member;
  const guild = interaction.guild;
  if (!guild || !member?.voice?.channelId) return { error: 'Join your temp voice channel first.' };
  const channel = member.voice.channel || await guild.channels.fetch(member.voice.channelId).catch(() => null);
  if (!channel) return { error: 'Your voice channel could not be found.' };
  const config = getGuildConfig(guild.id);
  const entry = config.voice?.temp?.channels?.[channel.id];
  if (!entry) return { error: 'That channel is not one of Neyora\'s temp voice channels.' };
  const ownerId = entry.ownerId;
  const ownerMember = ownerId ? await guild.members.fetch(ownerId).catch(() => null) : null;
  const ownerStillInside = ownerMember?.voice?.channelId === channel.id;
  const isOwner = ownerId === interaction.user.id;
  const canClaim = !ownerStillInside;
  if (!isOwner && !(options.allowClaim && canClaim)) return { error: `Only <@${ownerId}> can manage this temp voice right now.` };
  return { config, channel, entry, ownerMember, ownerStillInside, isOwner, canClaim };
}

async function setTempVoiceOwner(guild, channel, newOwnerId) {
  if (!guild || !channel || !newOwnerId) return false;
  const entry = getTempVoiceEntry(guild.id, channel.id);
  if (!entry) return false;
  const oldOwnerId = entry.ownerId;
  client.store.updateGuild(guild.id, (g) => {
    if (g.voice?.temp?.channels?.[channel.id]) g.voice.temp.channels[channel.id].ownerId = newOwnerId;
    return g;
  });
  await channel.permissionOverwrites.edit(newOwnerId, {
    Connect: true,
    Speak: true,
    ViewChannel: true,
    MoveMembers: true,
    ManageChannels: true,
    MuteMembers: true,
    DeafenMembers: true
  }).catch(() => null);
  if (oldOwnerId && oldOwnerId !== newOwnerId) {
    await channel.permissionOverwrites.edit(oldOwnerId, {
      Connect: true,
      Speak: true,
      ViewChannel: true,
      MoveMembers: null,
      ManageChannels: null,
      MuteMembers: null,
      DeafenMembers: null
    }).catch(() => null);
  }
  return true;
}

function createVoiceManageSelectRows(channelId) {
  return [
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`voicectl:transferselect:${channelId}`)
        .setPlaceholder('Transfer crown to a member in your temp voice')
        .setMinValues(1)
        .setMaxValues(1)
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`voicectl:kickselect:${channelId}`)
        .setPlaceholder('Kick a member from your temp voice')
        .setMinValues(1)
        .setMaxValues(1)
    )
  ];
}

client.applyPresence = function applyPresence() {
  const presence = client.store.getGlobal().presence || {};
  const status = ['online', 'idle', 'dnd', 'invisible'].includes(presence.status) ? presence.status : 'online';
  const activityType = typeof ACTIVITY_TYPES[presence.activityType] !== 'undefined' ? ACTIVITY_TYPES[presence.activityType] : ActivityType.Watching;
  const activityText = presence.activityText || 'your server';
  if (!client.user) return;
  client.user.setPresence({
    status,
    activities: [{ name: activityText, type: activityType }]
  });
};

client.runTikTokCheck = async function runTikTokCheck() {
  await checkTikTokWatchers(client);
};

function normalizePdpRotatorConfig(entry = {}) {
  return {
    enabled: false,
    guildId: entry?.guildId || null,
    intervalMs: Math.max(30_000, Number(entry?.intervalMs) || 30_000),
    includeBots: false,
    lastUserId: entry?.lastUserId || null,
    lastAvatarUrl: entry?.lastAvatarUrl || null,
    lastAppliedAt: Number(entry?.lastAppliedAt) || 0,
    lastAttemptAt: Number(entry?.lastAttemptAt) || 0,
    cooldownUntil: Number(entry?.cooldownUntil) || 0,
    lastError: entry?.lastError ? String(entry.lastError).slice(0, 180) : null
  };
}

function pdpAvatarUrlForMember(member) {
  return member?.user?.displayAvatarURL?.({ extension: 'png', size: 512 })
    || member?.displayAvatarURL?.({ extension: 'png', size: 512 })
    || null;
}

function pickRandomPdpMember(guild, config = {}) {
  const candidates = [...(guild?.members?.cache?.values?.() || [])].filter((member) => {
    if (!member?.user) return false;
    if (!config.includeBots && member.user.bot) return false;
    return Boolean(pdpAvatarUrlForMember(member));
  });
  if (!candidates.length) return null;
  const filtered = candidates.length > 1 && config.lastUserId
    ? candidates.filter((member) => member.id !== config.lastUserId)
    : candidates;
  const pool = filtered.length ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

client.runPdpRotator = async function runPdpRotator(force = false, options = {}) {
  const globalConfig = client.store.getGlobal();
  const config = normalizePdpRotatorConfig(globalConfig.pdpRotator || {});
  const manual = Boolean(options?.manual);
  const guildId = options?.guildId || config.guildId;
  if ((!config.enabled && !manual) || !guildId) return { ok: false, error: 'disabled' };
  const now = Date.now();
  if (!force) {
    if (config.cooldownUntil && config.cooldownUntil > now) return { ok: false, error: 'cooldown' };
    if (config.lastAttemptAt && now - config.lastAttemptAt < config.intervalMs) return { ok: false, error: 'interval' };
  }

  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    client.store.updateGlobal((global) => {
      global.pdpRotator = normalizePdpRotatorConfig(global.pdpRotator || {});
      global.pdpRotator.guildId = guildId;
      global.pdpRotator.lastAttemptAt = now;
      global.pdpRotator.lastError = 'server-not-found';
      return global;
    });
    return { ok: false, error: 'Server not found.' };
  }

  if (!guild.members.cache.size) await guild.members.fetch().catch(() => null);
  const member = pickRandomPdpMember(guild, config);
  if (!member) {
    client.store.updateGlobal((global) => {
      global.pdpRotator = normalizePdpRotatorConfig(global.pdpRotator || {});
      global.pdpRotator.guildId = guild.id;
      global.pdpRotator.lastAttemptAt = now;
      global.pdpRotator.lastError = 'no-valid-member';
      return global;
    });
    return { ok: false, error: 'No valid member avatar found in cache.' };
  }

  const avatarUrl = pdpAvatarUrlForMember(member);
  if (!avatarUrl || !client.user) return { ok: false, error: 'Avatar not available.' };

  try {
    await client.user.setAvatar(avatarUrl);
    client.store.updateGlobal((global) => {
      global.pdpRotator = normalizePdpRotatorConfig(global.pdpRotator || {});
      global.pdpRotator.guildId = guild.id;
      global.pdpRotator.lastUserId = member.id;
      global.pdpRotator.lastAvatarUrl = avatarUrl;
      global.pdpRotator.lastAppliedAt = now;
      global.pdpRotator.lastAttemptAt = now;
      global.pdpRotator.lastError = null;
      global.pdpRotator.cooldownUntil = 0;
      return global;
    });
    return {
      ok: true,
      guildId: guild.id,
      memberId: member.id,
      memberLabel: member.displayName || member.user.username || member.user.tag || member.id,
      avatarUrl
    };
  } catch (error) {
    const raw = String(error?.message || error || 'avatar-update-failed');
    const rateLimited = /rate|too fast|too many|retry|avatar too/i.test(raw);
    client.store.updateGlobal((global) => {
      global.pdpRotator = normalizePdpRotatorConfig(global.pdpRotator || {});
      global.pdpRotator.guildId = guild.id;
      global.pdpRotator.lastAttemptAt = now;
      global.pdpRotator.lastError = raw.slice(0, 180);
      if (rateLimited) global.pdpRotator.cooldownUntil = now + 60 * 60 * 1000;
      return global;
    });
    return {
      ok: false,
      error: rateLimited ? 'Discord blocked avatar changes for a while. Try again later.' : raw,
      avatarUrl,
      memberLabel: member.displayName || member.user.username || member.id
    };
  }
};

function scheduleLoop(name, delay, fn) {
  const run = async () => {
    try {
      await fn();
    } catch (error) {
      console.error(`[loop:${name}]`, error);
    }
  };
  setInterval(run, delay).unref?.();
}

function formatGuildStatCount(value) {
  return Number(value || 0).toLocaleString('fr-FR');
}

function buildGuildStatChannelName(template, count) {
  const formatted = formatGuildStatCount(count);
  const raw = String(template || '{count}').trim();
  const withCount = raw.includes('{count}') ? raw.replace(/\{count\}/gi, formatted) : `${raw} ${formatted}`;
  return withCount.slice(0, 100);
}

function getGuildLiveStats(guild) {
  const members = guild?.memberCount || guild?.members?.cache?.size || 0;
  const online = guild?.presences?.cache
    ? guild.presences.cache.filter((presence) => presence?.status && presence.status !== 'offline').size
    : 0;
  const voice = guild?.channels?.cache
    ? guild.channels.cache
        .filter((channel) => [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel?.type))
        .reduce((total, channel) => total + (channel.members?.filter((member) => !member.user?.bot).size || 0), 0)
    : 0;
  return { members, online, voice };
}

function queueVoiceStatsRefresh(guildId, delay = 1200) {
  if (!guildId) return;
  const existing = client.voiceStatsRefreshTimers.get(guildId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    client.voiceStatsRefreshTimers.delete(guildId);
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;
    await refreshGuildStats(guild).catch(() => null);
    queueProgressBoardRefresh(guild.id);
  }, delay);
  timer.unref?.();
  client.voiceStatsRefreshTimers.set(guildId, timer);
}

async function ensureGuildStatsChannels(guild, options = {}) {
  if (!guild) return null;
  const config = getGuildConfig(guild.id);
  const stats = config.stats || {};
  if (!stats.enabled) return null;
  const recreateMissing = options.recreateMissing !== false;
  const labels = {
    members: stats.labels?.members || '👥・Membres : {count}',
    online: stats.labels?.online || '🌐・En ligne : {count}',
    voice: stats.labels?.voice || '🔊・Vocal : {count}'
  };
  const live = getGuildLiveStats(guild);
  let category = stats.categoryId ? (guild.channels.cache.get(stats.categoryId) || await guild.channels.fetch(stats.categoryId).catch(() => null)) : null;
  if (!category || category.type !== ChannelType.GuildCategory) {
    const knownChannelIds = Object.values(stats.channels || {}).filter(Boolean);
    for (const knownId of knownChannelIds) {
      const knownChannel = guild.channels.cache.get(knownId) || await guild.channels.fetch(knownId).catch(() => null);
      const parent = knownChannel?.parent || (knownChannel?.parentId ? (guild.channels.cache.get(knownChannel.parentId) || await guild.channels.fetch(knownChannel.parentId).catch(() => null)) : null);
      if (parent?.type === ChannelType.GuildCategory) {
        category = parent;
        client.store.updateGuild(guild.id, (g) => {
          g.stats = g.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          g.stats.categoryId = parent.id;
          return g;
        });
        break;
      }
    }
  }
  const resolved = {};
  for (const [key, count] of Object.entries(live)) {
    let channelId = stats.channels?.[key] || null;
    let channel = channelId ? (guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null)) : null;
    if (!channel && recreateMissing && category?.type === ChannelType.GuildCategory) {
      channel = await guild.channels.create({
        name: buildGuildStatChannelName(labels[key], count),
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [{
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        }],
        reason: 'Neyora stats auto-repair'
      }).catch(() => null);
      if (channel) {
        channelId = channel.id;
        client.store.updateGuild(guild.id, (g) => {
          g.stats = g.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          g.stats.channels = g.stats.channels || {};
          g.stats.labels = { ...(g.stats.labels || {}), ...labels };
          g.stats.enabled = true;
          if (!g.stats.categoryId && category?.id) g.stats.categoryId = category.id;
          g.stats.channels[key] = channel.id;
          return g;
        });
      }
    }
    resolved[key] = channel || null;
  }
  return { labels, live, channels: resolved, category };
}

async function refreshGuildStats(guild, options = {}) {
  if (!guild) return null;
  const config = getGuildConfig(guild.id);
  if (!config.stats?.enabled) return null;
  const ensured = await ensureGuildStatsChannels(guild, { recreateMissing: options.recreateMissing !== false });
  const live = ensured?.live || getGuildLiveStats(guild);
  const labels = ensured?.labels || config.stats.labels || {};
  const targets = {
    members: { channel: ensured?.channels?.members || null, name: buildGuildStatChannelName(labels.members || '👥・Membres : {count}', live.members) },
    online: { channel: ensured?.channels?.online || null, name: buildGuildStatChannelName(labels.online || '🌐・En ligne : {count}', live.online) },
    voice: { channel: ensured?.channels?.voice || null, name: buildGuildStatChannelName(labels.voice || '🔊・Vocal : {count}', live.voice) }
  };
  for (const entry of Object.values(targets)) {
    const channel = entry.channel;
    if (!channel) continue;
    if (channel.name !== entry.name) await channel.setName(entry.name).catch(() => null);
  }
  return live;
}


function normalizeAnnouncementModeValue(value, fallback = 'embed') {
  return String(value || fallback).toLowerCase() === 'plain' ? 'plain' : 'embed';
}

function ensureGuildSectionShape(target, key, fallback) {
  if (!target[key] || typeof target[key] !== 'object') target[key] = JSON.parse(JSON.stringify(fallback));
  return target[key];
}

async function validateChannelRef(guild, id) {
  if (!id) return null;
  return guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
}

async function validateRoleRef(guild, id) {
  if (!id) return null;
  return guild.roles.cache.get(id) || await guild.roles.fetch(id).catch(() => null);
}

async function validateUserRef(guild, id) {
  if (!id) return null;
  const member = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
  return member?.user || await client.users.fetch(id).catch(() => null);
}

async function repairGuildConfiguration(guild, scope = 'all') {
  if (!guild) return null;
  const report = { scope, fixed: [], cleared: [], notes: [] };
  const wants = (name) => scope === 'all' || scope === name;

  client.store.updateGuild(guild.id, (g) => {
    if (!g || typeof g !== 'object') g = JSON.parse(JSON.stringify(DEFAULT_GUILD));
    if (wants('texts')) {
      const welcome = ensureGuildSectionShape(g, 'welcome', DEFAULT_GUILD.welcome);
      const leave = ensureGuildSectionShape(g, 'leave', DEFAULT_GUILD.leave);
      const boost = ensureGuildSectionShape(g, 'boost', DEFAULT_GUILD.boost);
      welcome.mode = normalizeAnnouncementModeValue(welcome.mode, DEFAULT_GUILD.welcome.mode);
      welcome.dmMode = normalizeAnnouncementModeValue(welcome.dmMode, DEFAULT_GUILD.welcome.dmMode);
      leave.mode = normalizeAnnouncementModeValue(leave.mode, DEFAULT_GUILD.leave.mode);
      leave.dmMode = normalizeAnnouncementModeValue(leave.dmMode, DEFAULT_GUILD.leave.dmMode);
      boost.mode = normalizeAnnouncementModeValue(boost.mode, DEFAULT_GUILD.boost.mode);
      for (const [obj, fallback, label] of [[welcome, DEFAULT_GUILD.welcome, 'welcome'], [leave, DEFAULT_GUILD.leave, 'leave'], [boost, DEFAULT_GUILD.boost, 'boost']]) {
        for (const [key, value] of Object.entries(fallback)) {
          if (typeof obj[key] === 'undefined') {
            obj[key] = JSON.parse(JSON.stringify(value));
            report.fixed.push(`${label}.${key} restored`);
          }
        }
      }
    }
    if (wants('logs')) {
      const logs = ensureGuildSectionShape(g, 'logs', DEFAULT_GUILD.logs);
      logs.channels = { ...DEFAULT_GUILD.logs.channels, ...(logs.channels || {}) };
      logs.typeChannels = logs.typeChannels || {};
      logs.types = { ...DEFAULT_GUILD.logs.types, ...(logs.types || {}) };
      report.fixed.push('logs shape normalized');
    }
    if (wants('support')) {
      const support = ensureGuildSectionShape(g, 'support', DEFAULT_GUILD.support);
      support.promptMode = normalizeAnnouncementModeValue(support.promptMode, DEFAULT_GUILD.support.promptMode);
      report.fixed.push('support shape normalized');
    }
    if (wants('roles')) {
      const roles = ensureGuildSectionShape(g, 'roles', DEFAULT_GUILD.roles);
      roles.autoRoles = Array.from(new Set((roles.autoRoles || []).map(String).filter(Boolean)));
      roles.autoRolesHumans = Array.from(new Set((roles.autoRolesHumans || []).map(String).filter(Boolean)));
      roles.autoRolesBots = Array.from(new Set((roles.autoRolesBots || []).map(String).filter(Boolean)));
      roles.rolePanels = roles.rolePanels || {};
      roles.reactionRoles = roles.reactionRoles || {};
      roles.statusRole = { ...DEFAULT_GUILD.roles.statusRole, ...(roles.statusRole || {}) };
      const triggerPool = [];
      if (roles.statusRole.matchText) triggerPool.push(String(roles.statusRole.matchText));
      if (Array.isArray(roles.statusRole.matchTexts)) triggerPool.push(...roles.statusRole.matchTexts.map(String));
      roles.statusRole.matchTexts = Array.from(new Set(triggerPool.map((entry) => entry.trim()).filter(Boolean)));
      roles.statusRole.matchText = roles.statusRole.matchTexts[0] || '';
      if (typeof roles.statusRole.removeWhenMissing !== 'boolean') roles.statusRole.removeWhenMissing = true;
      report.fixed.push('roles shape normalized');
    }
    if (wants('security')) {
      const automod = ensureGuildSectionShape(g, 'automod', DEFAULT_GUILD.automod);
      automod.whitelistUserIds = Array.from(new Set((automod.whitelistUserIds || []).map(String).filter(Boolean)));
      automod.whitelistRoleIds = Array.from(new Set((automod.whitelistRoleIds || []).map(String).filter(Boolean)));
      automod.ignoredChannels = Array.from(new Set([...(automod.ignoredChannels || []), ...(automod.ignoredSalons || [])].map(String).filter(Boolean)));
      automod.picOnlyChannels = Array.from(new Set([...(automod.picOnlyChannels || []), ...(automod.picOnlySalons || [])].map(String).filter(Boolean)));
      automod.ignoredSalons = undefined;
      automod.picOnlySalons = undefined;
      automod.ghostPing = { enabled: false, channelId: null, ...(automod.ghostPing || {}) };
      report.fixed.push('security lists normalized');
    }
    if (wants('stats')) {
      const stats = ensureGuildSectionShape(g, 'stats', DEFAULT_GUILD.stats);
      stats.channels = { ...DEFAULT_GUILD.stats.channels, ...(stats.channels || {}) };
      stats.labels = { ...DEFAULT_GUILD.stats.labels, ...(stats.labels || {}) };
      if (typeof stats.lockChannels !== 'boolean') stats.lockChannels = true;
      report.fixed.push('stats shape normalized');
    }
    return g;
  });

  const fresh = getGuildConfig(guild.id);

  if (wants('logs')) {
    const logs = fresh.logs || {};
    const routeKeys = ['channelId', 'default', 'messages', 'members', 'moderation', 'voice', 'server', 'social'];
    for (const key of routeKeys) {
      const id = key === 'channelId' ? logs.channelId : logs.channels?.[key];
      if (!id) continue;
      const channel = await validateChannelRef(guild, id);
      if (channel?.isTextBased?.()) continue;
      client.store.updateGuild(guild.id, (g) => {
        if (key === 'channelId') g.logs.channelId = null;
        else if (g.logs?.channels) g.logs.channels[key] = null;
        return g;
      });
      report.cleared.push(`logs ${key} channel was invalid`);
    }
    for (const [type, id] of Object.entries(logs.typeChannels || {})) {
      if (!id) continue;
      const channel = await validateChannelRef(guild, id);
      if (channel?.isTextBased?.()) continue;
      client.store.updateGuild(guild.id, (g) => {
        if (g.logs?.typeChannels) delete g.logs.typeChannels[type];
        return g;
      });
      report.cleared.push(`logs type route ${type} was invalid`);
    }
  }

  if (wants('support')) {
    const support = getGuildConfig(guild.id).support || {};
    for (const [label, id, field] of [['relay', support.channelId, 'channelId'], ['member entry', support.entryChannelId, 'entryChannelId']]) {
      if (!id) continue;
      const channel = await validateChannelRef(guild, id);
      if (channel?.isTextBased?.()) continue;
      client.store.updateGuild(guild.id, (g) => { if (g.support) g.support[field] = null; return g; });
      report.cleared.push(`support ${label} channel was invalid`);
    }
    if (support.pingRoleId) {
      const role = await validateRoleRef(guild, support.pingRoleId);
      if (!role) {
        client.store.updateGuild(guild.id, (g) => { if (g.support) g.support.pingRoleId = null; return g; });
        report.cleared.push('support ping role was invalid');
      }
    }
  }

  if (wants('roles')) {
    const roles = getGuildConfig(guild.id).roles || {};
    const autoRoleFields = ['autoRoles', 'autoRolesHumans', 'autoRolesBots'];
    for (const field of autoRoleFields) {
      const validRoleIds = [];
      for (const id of roles[field] || []) {
        const role = await validateRoleRef(guild, id);
        if (role) validRoleIds.push(String(id));
        else report.cleared.push(`${field} role ${id} removed`);
      }
      client.store.updateGuild(guild.id, (g) => {
        if (g.roles) g.roles[field] = validRoleIds;
        return g;
      });
    }

    const statusRoleId = roles.statusRole?.roleId;
    if (statusRoleId) {
      const role = await validateRoleRef(guild, statusRoleId);
      if (!role) {
        client.store.updateGuild(guild.id, (g) => {
          if (g.roles?.statusRole) g.roles.statusRole.roleId = null;
          return g;
        });
        report.cleared.push('status role target was invalid');
      }
    }

    const cleanedTriggers = Array.from(new Set([
      ...(Array.isArray(roles.statusRole?.matchTexts) ? roles.statusRole.matchTexts : []),
      roles.statusRole?.matchText || ''
    ].map((entry) => String(entry || '').trim()).filter(Boolean)));
    client.store.updateGuild(guild.id, (g) => {
      if (g.roles?.statusRole) {
        g.roles.statusRole.matchTexts = cleanedTriggers;
        g.roles.statusRole.matchText = cleanedTriggers[0] || '';
      }
      return g;
    });
    if (cleanedTriggers.length) report.fixed.push('status role triggers normalized');
  }

  if (wants('security')) {
    const automod = getGuildConfig(guild.id).automod || {};
    const validUsers = [];
    for (const id of automod.whitelistUserIds || []) {
      const user = await validateUserRef(guild, id);
      if (user) validUsers.push(String(id));
      else report.cleared.push(`whitelist user ${id} removed`);
    }
    const validRoles = [];
    for (const id of automod.whitelistRoleIds || []) {
      const role = await validateRoleRef(guild, id);
      if (role) validRoles.push(String(id));
      else report.cleared.push(`whitelist role ${id} removed`);
    }
    const validIgnored = [];
    for (const id of automod.ignoredChannels || []) {
      const channel = await validateChannelRef(guild, id);
      if (channel) validIgnored.push(String(id));
      else report.cleared.push(`ignored channel ${id} removed`);
    }
    const validPicOnly = [];
    for (const id of automod.picOnlyChannels || []) {
      const channel = await validateChannelRef(guild, id);
      if (channel?.isTextBased?.()) validPicOnly.push(String(id));
      else report.cleared.push(`pic-only channel ${id} removed`);
    }
    client.store.updateGuild(guild.id, (g) => {
      if (g.automod) {
        g.automod.whitelistUserIds = validUsers;
        g.automod.whitelistRoleIds = validRoles;
        g.automod.ignoredChannels = validIgnored;
        g.automod.picOnlyChannels = validPicOnly;
      }
      return g;
    });
  }

  if (wants('stats')) {
    const stats = getGuildConfig(guild.id).stats || {};
    let inferredCategoryId = stats.categoryId || null;
    if (!inferredCategoryId) {
      for (const id of Object.values(stats.channels || {}).filter(Boolean)) {
        const channel = await validateChannelRef(guild, id);
        if (channel?.parentId) {
          inferredCategoryId = channel.parentId;
          client.store.updateGuild(guild.id, (g) => { if (g.stats) g.stats.categoryId = inferredCategoryId; return g; });
          report.fixed.push('stats category inferred from an existing counter');
          break;
        }
      }
    }
    if (inferredCategoryId) {
      const category = await validateChannelRef(guild, inferredCategoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        client.store.updateGuild(guild.id, (g) => { if (g.stats) g.stats.categoryId = null; return g; });
        report.cleared.push('stats category was invalid');
      }
    }
    const ensured = await ensureGuildStatsChannels(guild, { recreateMissing: true });
    if (ensured) {
      await refreshGuildStats(guild);
      report.notes.push('stats counters were refreshed');
    } else {
      report.notes.push('stats are disabled or missing a category, so no counters were recreated');
    }
  }

  return report;
}

client.repairGuildConfiguration = repairGuildConfiguration;

async function refreshProgressBoard(guild, options = {}) {
  if (!guild) return null;
  const config = getGuildConfig(guild.id);
  const progress = config.progress || {};
  if (!progress.enabled || !progress.channelId) return null;
  const channel = guild.channels.cache.get(progress.channelId) || await guild.channels.fetch(progress.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;
  let message = progress.messageId ? await channel.messages.fetch(progress.messageId).catch(() => null) : null;
  if (!message && !options.createIfMissing) return null;
  const payload = { embeds: [createServerProgressEmbed(config, guild)], components: [] };
  if (message) await message.edit(payload).catch(() => null);
  if (!message) message = await channel.send(payload).catch(() => null);
  if (!message) return null;
  client.store.updateGuild(guild.id, (g) => {
    g.progress = g.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
    g.progress.enabled = true;
    g.progress.channelId = channel.id;
    g.progress.messageId = message.id;
    g.progress.lastUpdatedAt = Date.now();
    return g;
  });
  return { channelId: channel.id, messageId: message.id };
}

function queueProgressBoardRefresh(guildId, delay = 2500) {
  if (!guildId) return;
  const previous = client.progressRefreshTimers.get(guildId);
  if (previous) clearTimeout(previous);
  const timer = setTimeout(async () => {
    client.progressRefreshTimers.delete(guildId);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    await refreshProgressBoard(guild, { createIfMissing: false });
  }, delay);
  timer.unref?.();
  client.progressRefreshTimers.set(guildId, timer);
}

client.refreshProgressBoard = refreshProgressBoard;

async function handleMemberMilestoneReward(member) {
  if (!member?.guild || member.user?.bot) return false;
  const config = getGuildConfig(member.guild.id);
  const reward = config.progress?.memberMilestoneReward || {};
  if (!reward.enabled || !reward.roleId) return false;

  const interval = Math.max(1, Number(reward.interval) || 100);
  const currentCount = member.guild.memberCount || member.guild.members.cache.size || 0;
  if (!currentCount || currentCount % interval !== 0) return false;

  const awardedCounts = new Set((reward.awardedCounts || []).map((value) => Number(value)).filter((value) => Number.isFinite(value)));
  if (awardedCounts.has(currentCount)) return false;

  const role = member.guild.roles.cache.get(reward.roleId) || await member.guild.roles.fetch(reward.roleId).catch(() => null);
  if (!role) return false;

  const me = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) return false;

  const added = await member.roles.add(role, `Neyora member milestone reward #${currentCount}`).then(() => true).catch(() => false);
  if (!added) return false;

  client.store.updateGuild(member.guild.id, (guild) => {
    guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null, title: null, imageMode: 'servericon', imageUrl: null, customGoals: { members: null, boosts: null, voice: null }, memberMilestoneReward: { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] } };
    guild.progress.memberMilestoneReward = guild.progress.memberMilestoneReward || { enabled: false, interval: 100, roleId: null, channelId: null, awardedCounts: [] };
    if (!Array.isArray(guild.progress.memberMilestoneReward.awardedCounts)) guild.progress.memberMilestoneReward.awardedCounts = [];
    if (!guild.progress.memberMilestoneReward.awardedCounts.includes(currentCount)) guild.progress.memberMilestoneReward.awardedCounts.push(currentCount);
    guild.progress.lastUpdatedAt = Date.now();
    return guild;
  });

  const description = [
    `${member} devient le **${formatGuildStatCount(currentCount)}e membre** du serveur.`,
    `Récompense: ${role}.`,
    `Prochain palier: **${formatGuildStatCount(currentCount + interval)}**`
  ].join('\n');

  if (reward.channelId) {
    const channel = await member.guild.channels.fetch(reward.channelId).catch(() => null);
    if (channel?.isTextBased?.()) {
      await channel.send({ embeds: [baseEmbed(config, '🏅 Nouveau membre palier', description)] }).catch(() => null);
    }
  }

  await sendLog(member.guild, 'memberJoin', 'Member milestone reward', `${member.user.tag} reached member milestone #${currentCount} and received ${role.name}.`);
  return true;
}

async function enforceVoiceRestrictions(member, attemptedChannelId = null) {
  if (!member?.guild || member.user?.bot) return false;
  const config = getGuildConfig(member.guild.id);
  const moderation = config.voice?.moderation || {};
  const channelId = attemptedChannelId || member.voice?.channelId;
  if (!moderation.banRoleId || !channelId) return false;
  if (!member.roles.cache.has(moderation.banRoleId)) return false;
  await member.voice.disconnect('Neyora voice ban enforcement').catch(() => null);
  return true;
}

async function syncVoiceMuteForMember(member) {
  if (!member?.guild || member.user?.bot || !member.voice?.channelId) return false;
  const config = getGuildConfig(member.guild.id);
  const moderation = config.voice?.moderation || {};
  if (!moderation.muteRoleId) return false;
  if (!member.roles.cache.has(moderation.muteRoleId)) return false;
  if (member.voice.serverMute) return true;
  await member.voice.setMute(true, 'Neyora voice mute role enforcement').catch(() => null);
  return true;
}

client.refreshGuildStats = refreshGuildStats;
client.ensureGuildStatsChannels = ensureGuildStatsChannels;

function getLogTypeColor(type, fallback = '#5865F2') {
  const map = {
    messageDelete: '#EF4444',
    messageEdit: '#F59E0B',
    ghostPing: '#8B5CF6',
    memberJoin: '#22C55E',
    memberLeave: '#F97316',
    memberUpdate: '#38BDF8',
    boost: '#EC4899',
    invite: '#14B8A6',
    moderation: '#EF4444',
    security: '#DC2626',
    giveaway: '#FACC15',
    support: fallback,
    tiktok: '#111827',
    voiceJoin: '#22C55E',
    voiceLeave: '#F97316',
    voiceMove: '#38BDF8',
    roleCreate: '#22C55E',
    roleDelete: '#EF4444',
    roleUpdate: '#F59E0B',
    channelCreate: '#22C55E',
    channelDelete: '#EF4444',
    channelUpdate: '#F59E0B',
    threadCreate: '#22C55E',
    threadDelete: '#EF4444',
    serverUpdate: '#60A5FA'
  };
  return ensureHexColor(map[type] || fallback || '#5865F2');
}


async function fetchRecentAuditEntry(guild, auditType, targetId = null, maxAgeMs = 20_000) {
  if (!guild || typeof guild.fetchAuditLogs !== 'function' || typeof auditType === 'undefined') return null;
  const logs = await guild.fetchAuditLogs({ type: auditType, limit: 6 }).catch(() => null);
  if (!logs?.entries?.size) return null;
  const now = Date.now();
  return logs.entries.find((entry) => {
    const entryTargetId = entry?.target?.id || entry?.targetId || null;
    const recentEnough = entry?.createdTimestamp ? (now - entry.createdTimestamp <= maxAgeMs) : true;
    const sameTarget = !targetId || !entryTargetId || String(entryTargetId) === String(targetId);
    return recentEnough && sameTarget;
  }) || null;
}

function formatAuditExecutor(entry) {
  return entry?.executor?.id ? `<@${entry.executor.id}>` : 'Unknown';
}

function getAuditReason(entry) {
  return entry?.reason ? String(entry.reason).slice(0, 240) : null;
}

async function buildLogEmbed(guild, config, type, title, description, options = {}) {
  const footerParts = [options.footerText || `Neyora • logs • ${type}`];
  if (options.channelId) footerParts.push(`channel ${options.channelId}`);
  if (options.messageId) footerParts.push(`message ${options.messageId}`);
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(options.color || getLogTypeColor(type, config?.embedColor || '#5865F2')))
    .setTitle(title)
    .setDescription(String(description || '').slice(0, 4096) || 'No details.')
    .setFooter({ text: footerParts.join(' • ').slice(0, 2048) })
    .setTimestamp();

  if (options.url) embed.setURL(String(options.url));

  let authorName = options.authorName || options.userTag || null;
  let avatarUrl = options.avatarUrl || null;
  const userId = options.userId || options.authorId || null;

  if ((userId && !avatarUrl) || (userId && !authorName)) {
    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
    const user = member?.user || await client.users.fetch(userId).catch(() => null);
    if (user) {
      if (!authorName) authorName = user.tag;
      if (!avatarUrl) avatarUrl = user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
    }
  }

  if (authorName) embed.setAuthor({ name: authorName, iconURL: avatarUrl || undefined });
  if (options.thumbnailUrl || (avatarUrl && options.showAvatarThumbnail !== false)) embed.setThumbnail(options.thumbnailUrl || avatarUrl);
  if (options.imageUrl) embed.setImage(options.imageUrl);

  const fields = Array.isArray(options.fields)
    ? options.fields
        .filter((field) => field && field.name && typeof field.value !== 'undefined' && field.value !== null && String(field.value).trim())
        .slice(0, 12)
        .map((field) => ({
          name: String(field.name).slice(0, 256),
          value: String(field.value).slice(0, 1024),
          inline: Boolean(field.inline)
        }))
    : [];
  if (fields.length) embed.addFields(fields);
  return embed;
}


function buildModerationNoticeEmbed(guildConfig, action, target, moderator, details = {}) {
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(details.color || guildConfig?.embedColor || '#5865F2'))
    .setTitle(details.title || action)
    .setDescription(details.description || 'A staff action was applied on you.')
    .setTimestamp();
  const avatarUrl = target?.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || target?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
  if (target?.user?.tag || target?.tag) embed.setAuthor({ name: target?.user?.tag || target?.tag, iconURL: avatarUrl || undefined });
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  const fields = [
    details.reason ? { name: 'Reason', value: String(details.reason).slice(0, 1024), inline: false } : null,
    details.duration ? { name: 'Duration', value: String(details.duration).slice(0, 1024), inline: true } : null,
    moderator ? { name: 'Moderator', value: `<@${moderator.id}>`, inline: true } : null,
    guildConfig?.support?.entryChannelId ? { name: 'Support', value: `<#${guildConfig.support.entryChannelId}>`, inline: true } : null
  ].filter(Boolean);
  if (fields.length) embed.addFields(fields.slice(0, 10));
  embed.setFooter({ text: details.footerText || `${guildConfig?.name || 'Neyora'} • moderation` });
  return embed;
}

async function notifyModerationTarget(targetMember, moderatorUser, details = {}) {
  if (!targetMember?.user || targetMember.user.bot) return false;
  const guildConfig = targetMember.guild ? getGuildConfig(targetMember.guild.id) : null;
  const embed = buildModerationNoticeEmbed(guildConfig, details.action || 'Moderation', targetMember, moderatorUser, details);
  const sent = await targetMember.user.send({ embeds: [embed] }).catch(() => null);
  return Boolean(sent);
}

client.notifyModerationTarget = notifyModerationTarget;

async function sendLog(guild, type, title, description, options = {}) {
  if (!guild) return;
  const config = getGuildConfig(guild.id);
  if (!config.logs.enabled) return;
  if (config.logs.types && config.logs.types[type] === false) return;
  const routeKey = getLogRouteKey(type);
  const routeChannels = config.logs.channels || {};
  const typeChannels = config.logs.typeChannels || {};
  const channelId = typeChannels[type] || routeChannels[routeKey] || routeChannels.default || config.logs.channelId;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;
  const embed = await buildLogEmbed(guild, config, type, title, description, options);
  await channel.send({ embeds: [embed] }).catch(() => null);
}

client.sendLog = sendLog;

function clipText(value, max = 500) {
  const text = String(value || '').trim();
  if (!text) return '[empty]';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function getMentionTargets(message) {
  const targets = [];
  const content = String(message?.content || '');

  if (message?.mentions) {
    for (const user of message.mentions.users?.values?.() || []) targets.push({ key: `u:${user.id}`, label: `<@${user.id}>` });
    const repliedUser = message.mentions.repliedUser;
    if (repliedUser?.id) targets.push({ key: `u:${repliedUser.id}`, label: `<@${repliedUser.id}>` });
    for (const role of message.mentions.roles?.values?.() || []) targets.push({ key: `r:${role.id}`, label: `<@&${role.id}>` });
    if (message.mentions.everyone) targets.push({ key: 'everyone', label: '@everyone / @here' });
  }

  for (const match of content.matchAll(/<@!?(\d{17,20})>/g)) targets.push({ key: `u:${match[1]}`, label: `<@${match[1]}>` });
  for (const match of content.matchAll(/<@&(\d{17,20})>/g)) targets.push({ key: `r:${match[1]}`, label: `<@&${match[1]}>` });
  if (/@everyone|@here/.test(content)) targets.push({ key: 'everyone', label: '@everyone / @here' });

  const seen = new Set();
  return targets.filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
}

function getRemovedMentionTargets(oldMessage, newMessage) {
  const before = oldMessage?.targets || getMentionTargets(oldMessage);
  if (!before.length) return [];
  const afterKeys = new Set((newMessage?.targets || getMentionTargets(newMessage)).map((entry) => entry.key));
  return before.filter((entry) => !afterKeys.has(entry.key));
}

function markGhostPingDeleteSeen(messageId) {
  if (!messageId) return;
  client.ghostPingDeleteSeen.set(messageId, Date.now());
  const now = Date.now();
  for (const [id, ts] of client.ghostPingDeleteSeen.entries()) {
    if (now - ts > 2 * 60 * 1000) client.ghostPingDeleteSeen.delete(id);
  }
}

function hasRecentGhostPingDeleteSeen(messageId) {
  const ts = client.ghostPingDeleteSeen.get(messageId);
  return Boolean(ts && Date.now() - ts <= 2 * 60 * 1000);
}

function pruneGhostPingCache() {
  const now = Date.now();
  const maxAge = 6 * 60 * 60 * 1000;
  for (const [messageId, entry] of client.ghostPingCache.entries()) {
    if (!entry?.cachedAt || now - entry.cachedAt > maxAge) client.ghostPingCache.delete(messageId);
  }
  if (client.ghostPingCache.size <= 5000) return;
  const overflow = [...client.ghostPingCache.entries()].sort((a, b) => (a[1]?.cachedAt || 0) - (b[1]?.cachedAt || 0));
  for (const [messageId] of overflow.slice(0, client.ghostPingCache.size - 5000)) client.ghostPingCache.delete(messageId);
}

function cacheGhostPingMessage(message) {
  if (!message?.guild || !message?.id || !message?.author || message.author.bot) return null;
  const payload = {
    messageId: message.id,
    guildId: message.guild.id,
    channelId: message.channel?.id || null,
    authorId: message.author.id,
    authorTag: message.author.tag,
    authorAvatar: message.author.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
    content: message.content || '',
    url: message.url || null,
    attachmentUrls: Array.from(message.attachments?.values?.() || []).map((file) => file.url).filter(Boolean),
    imageUrl: Array.from(message.attachments?.values?.() || []).find((file) => file.contentType?.startsWith?.('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name || ''))?.url || null,
    targets: getMentionTargets(message),
    cachedAt: Date.now()
  };
  client.ghostPingCache.set(message.id, payload);
  pruneGhostPingCache();
  return payload;
}

function getGhostPingSnapshot(message) {
  if (!message?.id) return null;
  const cached = client.ghostPingCache.get(message.id) || null;
  const parsedTargets = getMentionTargets(message);
  if (!cached && !message?.author) return null;
  const targetMap = new Map();
  for (const entry of cached?.targets || []) targetMap.set(entry.key, entry);
  for (const entry of parsedTargets) targetMap.set(entry.key, entry);
  return {
    messageId: message.id,
    guildId: message.guild?.id || cached?.guildId || null,
    channelId: message.channel?.id || cached?.channelId || null,
    authorId: message.author?.id || cached?.authorId || null,
    authorTag: message.author?.tag || cached?.authorTag || 'Unknown',
    authorAvatar: message.author?.displayAvatarURL?.({ extension: 'png', size: 256 }) || cached?.authorAvatar || null,
    content: typeof message.content === 'string' ? message.content : (cached?.content || ''),
    url: message.url || cached?.url || null,
    attachmentUrls: Array.from(message.attachments?.values?.() || []).map((file) => file.url).filter(Boolean).length ? Array.from(message.attachments?.values?.() || []).map((file) => file.url).filter(Boolean) : (cached?.attachmentUrls || []),
    imageUrl: Array.from(message.attachments?.values?.() || []).find((file) => file.contentType?.startsWith?.('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name || ''))?.url || cached?.imageUrl || null,
    targets: [...targetMap.values()],
    cachedAt: Date.now()
  };
}

function getGhostPingSnapshotById(messageId) {
  const cached = client.ghostPingCache.get(messageId) || null;
  if (!cached) return null;
  return {
    messageId,
    guildId: cached.guildId || null,
    channelId: cached.channelId || null,
    authorId: cached.authorId || null,
    authorTag: cached.authorTag || 'Unknown',
    authorAvatar: cached.authorAvatar || null,
    content: cached.content || '',
    url: cached.url || null,
    attachmentUrls: cached.attachmentUrls || [],
    imageUrl: cached.imageUrl || null,
    targets: cached.targets || [],
    cachedAt: cached.cachedAt || Date.now()
  };
}

async function handleGhostPingDeleteSnapshot(guild, snapshot) {
  if (!guild || !snapshot?.messageId) return;
  markGhostPingDeleteSeen(snapshot.messageId);
  if (snapshot?.authorTag && snapshot.channelId) {
    client.snipeCache.set(snapshot.channelId, {
      content: snapshot.content,
      authorTag: snapshot.authorTag,
      authorAvatar: snapshot.authorAvatar || null,
      deletedAt: Date.now()
    });
  }
  if (snapshot?.targets?.length) {
    await sendGhostPingAlert(guild, {
      mode: 'delete',
      message: {
        author: { tag: snapshot.authorTag, id: snapshot.authorId },
        channel: { id: snapshot.channelId },
        url: snapshot.url
      },
      targets: snapshot.targets,
      before: snapshot.content || '[empty / embed]'
    });
  }
  if (snapshot?.authorTag) {
    await sendLog(guild, 'messageDelete', '🗑️ Message deleted', clipText(snapshot.content || '[empty / embed]', 1200), {
      userId: snapshot.authorId,
      authorName: snapshot.authorTag,
      avatarUrl: snapshot.authorAvatar || null,
      imageUrl: snapshot.imageUrl || null,
      fields: [
        { name: 'Author', value: snapshot.authorId ? `<@${snapshot.authorId}>` : snapshot.authorTag || 'Unknown', inline: true },
        { name: 'Channel', value: snapshot.channelId ? `<#${snapshot.channelId}>` : 'Unknown', inline: true },
        { name: 'Message ID', value: `\`${snapshot.messageId}\``, inline: true },
        { name: 'Attachments', value: String((snapshot.attachmentUrls || []).length || 0), inline: true },
        { name: 'Jump', value: snapshot.url || 'Unavailable', inline: false }
      ],
      channelId: snapshot.channelId || null,
      messageId: snapshot.messageId || null,
      url: snapshot.url || null
    });
  }
  client.ghostPingCache.delete(snapshot.messageId);
}

async function sendGhostPingAlert(guild, payload) {
  if (!guild || !payload?.message) return;
  const targets = payload.targets || [];
  const lines = [
    `**User:** ${payload.message.author?.tag || 'Unknown'}${payload.message.author?.id ? ` (<@${payload.message.author.id}>)` : ''}`,
    `**Channel:** <#${payload.message.channel?.id}>`,
    `**Type:** ${payload.mode === 'edit' ? 'mentions removed after an edit' : 'message deleted after pinging'}`,
    `**Targets:** ${targets.length ? targets.map((entry) => entry.label).join(', ') : 'Unknown'}`,
    `**Before:** ${clipText(payload.before)}`
  ];
  if (payload.mode === 'edit') lines.push(`**After:** ${clipText(payload.after)}`);
  if (payload.message.url && payload.mode === 'edit') lines.push(`**Jump:** ${payload.message.url}`);
  const description = lines.join('\n');
  await sendLog(guild, 'ghostPing', '👻 Ghost ping detected', description);
}

async function sendJoinGhostPing(member) {
  if (!member?.guild || !member.user) return false;
  const config = getGuildConfig(member.guild.id);
  const rule = config.automod?.ghostPing || { enabled: false, channelId: null };
  if (!rule.enabled || !rule.channelId) return false;

  const channel = member.guild.channels.cache.get(rule.channelId) || await member.guild.channels.fetch(rule.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return false;

  const sent = await channel.send({
    content: `<@${member.id}>`,
    allowedMentions: { users: [member.id], roles: [], parse: [], repliedUser: false }
  }).catch(() => null);
  if (!sent) return false;
  setTimeout(() => sent.delete().catch(() => null), 2_000).unref?.();
  return true;
}

function getCustomStatusText(presenceLike) {
  const presence = presenceLike?.activities ? presenceLike : presenceLike?.presence;
  const activity = presence?.activities?.find((entry) => entry?.type === 4 && entry?.state);
  return String(activity?.state || '').trim();
}

function normalizeStatusRoleText(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function getStatusRoleNeedles(rule = {}) {
  const rawValues = Array.from(new Set([...(Array.isArray(rule.matchTexts) ? rule.matchTexts : []), rule.matchText].map((entry) => String(entry || '').trim()).filter(Boolean)));
  const needles = new Set();
  for (const raw of rawValues) {
    const lower = raw.toLowerCase();
    needles.add(lower);
    const normalized = normalizeStatusRoleText(raw);
    if (normalized) needles.add(normalized);
    const parts = lower.split(/[\s,;|]+/).filter(Boolean);
    for (const part of parts) {
      needles.add(part);
      const segment = part.split('/').filter(Boolean).pop();
      if (segment) needles.add(segment);
      const compact = part.replace(/[^a-z0-9]/g, '');
      if (compact) needles.add(compact);
    }
  }
  return Array.from(needles).filter(Boolean).sort((a, b) => b.length - a.length);
}

function statusRoleMatches(customStatus = '', rule = {}) {
  const rawHaystack = String(customStatus || '').toLowerCase();
  const normalizedHaystack = normalizeStatusRoleText(customStatus);
  const needles = getStatusRoleNeedles(rule);
  if (!needles.length) return false;
  if (String(rule.mode || 'includes').toLowerCase() === 'exact') {
    return needles.some((needle) => rawHaystack === needle || normalizedHaystack === needle);
  }
  return needles.some((needle) => rawHaystack.includes(needle) || normalizedHaystack.includes(needle));
}

async function syncStatusRoleForMember(member, presenceLike = null) {
  if (!member?.guild || member.user?.bot) return false;
  const config = getGuildConfig(member.guild.id);
  const rule = config.roles?.statusRole || {};
  if (!rule.enabled || !rule.roleId || !(rule.matchText || (Array.isArray(rule.matchTexts) && rule.matchTexts.length))) return false;

  const role = member.guild.roles.cache.get(rule.roleId) || await member.guild.roles.fetch(rule.roleId).catch(() => null);
  if (!role || !member.manageable) return false;

  const me = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
  if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) return false;

  const customStatus = getCustomStatusText(presenceLike || member);
  const matches = statusRoleMatches(customStatus, rule);
  const hasRole = member.roles.cache.has(role.id);

  if (matches && !hasRole) {
    await member.roles.add(role, 'Status role matched custom status').catch(() => null);
    return true;
  }

  if (!matches && hasRole && rule.removeWhenMissing !== false) {
    await member.roles.remove(role, 'Status role no longer matched custom status').catch(() => null);
  }

  return matches;
}

client.syncStatusRoleForGuild = async function syncStatusRoleForGuild(guild) {
  if (!guild) return { checked: 0, matched: 0 };
  const members = await guild.members.fetch({ withPresences: true }).catch(() => null);
  if (!members) return { checked: 0, matched: 0 };
  let checked = 0;
  let matched = 0;
  for (const member of members.values()) {
    if (member.user?.bot) continue;
    checked += 1;
    if (await syncStatusRoleForMember(member)) matched += 1;
  }
  return { checked, matched };
};

function buildCtx(source, command) {
  const interaction = source.isChatInputCommand?.() ? source : null;
  const message = source.content !== undefined ? source : null;
  const guild = interaction?.guild || message?.guild || null;
  const guildConfig = guild ? getGuildConfig(guild.id) : { prefix: DEFAULT_PREFIX, embedColor: '#5865F2', support: {}, roles: { autoRoles: [] }, tiktok: { watchers: [] }, giveaways: {}, logs: { enabled: false }, automod: {}, moderation: { warnings: {} }, invites: { stats: {} } };
  const channel = interaction?.channel || message?.channel || null;
  const member = interaction?.member || message?.member || null;
  const user = interaction?.user || message?.author || null;
  const prefix = guildConfig.prefix || DEFAULT_PREFIX;
  const rawAfterPrefix = message ? message.content.slice(prefix.length).trim() : '';
  const splitAfterPrefix = rawAfterPrefix ? rawAfterPrefix.split(/\s+/) : [];
  const args = splitAfterPrefix.slice(1);
  const argsText = args.join(' ');


  installPayloadGuardsOnTarget(channel, { methods: ['send'] });
  installPayloadGuardsOnTarget(message, { methods: ['edit', 'reply'] });

  const ctx = {
    source,
    interaction,
    message,
    guild,
    guildConfig,
    channel,
    member,
    user,
    client,
    command,
    args,
    argsText,
    prefix,
    store: client.store,
    lastReply: null,
    async reply(payload = {}) {
      let sent;
      const { deleteAfter = null, ...rest } = payload || {};
      const localized = localizePayload(guildConfig, rest);
      const branded = applyGuildPayloadBranding(localized, guild, guildConfig);
      const normalized = normalizeSystemNoticePayload(branded, guildConfig, { defaultDeleteAfter: TRANSIENT_SYSTEM_DELETE_MS });
      const guarded = sanitizeDiscordPayload(normalized.payload);
      if (interaction) {
        const base = { ...guarded };
        if (!interaction.replied && !interaction.deferred) sent = await interaction.reply({ ...base, fetchReply: true });
        else sent = await interaction.followUp(base);
      } else {
        sent = await channel.send(guarded);
        const shouldDelete = Number.isFinite(deleteAfter) ? deleteAfter : null;
        if (sent && shouldDelete) scheduleMessageDelete(sent, shouldDelete);
      }
      this.lastReply = sent || null;
      if (this.command?.name === 'embed' && sent) {
        for (const draft of client.embedDrafts.values()) {
          if (draft.ownerId === this.user.id && draft.channelId === this.channel.id && !draft.messageId) {
            draft.messageId = sent.id;
            break;
          }
        }
      }
      return sent;
    },
    getText(optionName, argIndex = 0) {
      if (interaction) {
        return interaction.options.getString(optionName)
          ?? (interaction.options.getInteger(optionName) != null ? String(interaction.options.getInteger(optionName)) : null)
          ?? (interaction.options.getNumber(optionName) != null ? String(interaction.options.getNumber(optionName)) : null)
          ?? (interaction.options.getBoolean(optionName) != null ? String(interaction.options.getBoolean(optionName)) : null)
          ?? interaction.options.getUser(optionName)?.id
          ?? interaction.options.getChannel(optionName)?.id
          ?? interaction.options.getRole(optionName)?.id
          ?? null;
      }
      return args[argIndex] ?? null;
    },
    getRest(argIndex = 0) {
      if (interaction) return null;
      const value = args.slice(argIndex).join(' ').trim();
      return value || null;
    },
    async getMember(optionName, argIndex = 0) {
      if (!guild) return null;
      if (interaction) return interaction.options.getMember(optionName) || null;
      const raw = args[argIndex];
      if (!raw) return null;
      const fromCache = parseUserArgument(raw, guild);
      if (fromCache) return fromCache;
      const cleaned = raw.replace(/[<@!>]/g, '');
      if (/^\d{17,20}$/.test(cleaned)) return guild.members.fetch(cleaned).catch(() => null);
      return guild.members.cache.find((m) => m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase()) || null;
    },
    async getRole(optionName, argIndex = 0) {
      if (!guild) return null;
      if (interaction) return interaction.options.getRole(optionName) || null;
      return parseRoleArgument(args[argIndex], guild);
    },
    async getChannel(optionName, argIndex = 0) {
      if (!guild) return null;
      if (interaction) return interaction.options.getChannel(optionName) || null;
      const raw = args[argIndex];
      const parsed = parseChannelArgument(raw, guild);
      if (parsed) return parsed;
      const cleaned = String(raw || '').replace(/[<#>]/g, '');
      if (/^\d{17,20}$/.test(cleaned)) return guild.channels.fetch(cleaned).catch(() => null);
      return null;
    },
    canActOn(targetMember) {
      if (!guild || !member || !targetMember) return false;
      if (targetMember.id === guild.ownerId) return false;
      if (targetMember.id === user.id) return false;
      const me = guild.members.me;
      if (!me) return false;
      return targetMember.roles.highest.position < member.roles.highest.position && targetMember.roles.highest.position < me.roles.highest.position;
    },
    async invalidUsage(extra = '') {
      const usage = formatInvalidUsageText(command, guildConfig, prefix, extra);
      const payload = { embeds: [baseEmbed(guildConfig, '❌ Invalid usage', usage)], deleteAfter: TRANSIENT_SYSTEM_DELETE_MS };
      if (interaction) {
        return this.reply({ ...payload, ephemeral: true });
      }
      return this.reply(payload);
    }
  };

  return ctx;
}

function resolveSlashCommand(interaction) {
  const root = interaction.commandName;
  const sub = interaction.options.getSubcommand(false);
  return client.commandRegistry.find((command) => command.slash?.root === root && command.slash?.sub === sub) || null;
}


function installPayloadGuardsOnTarget(target, options = {}) {
  if (!target || typeof target !== 'object') return target;
  const methods = Array.isArray(options.methods) ? options.methods : [];
  const modalMethods = Array.isArray(options.modalMethods) ? options.modalMethods : [];
  if (!target.__dvlGuardedMethods) {
    Object.defineProperty(target, '__dvlGuardedMethods', { value: new Set(), configurable: true });
  }
  const guarded = target.__dvlGuardedMethods;

  for (const method of methods) {
    if (!method || guarded.has(method) || typeof target[method] !== 'function') continue;
    const original = target[method].bind(target);
    target[method] = (payload = {}) => original(sanitizeDiscordPayload(payload));
    guarded.add(method);
  }

  for (const method of modalMethods) {
    if (!method || guarded.has(method) || typeof target[method] !== 'function') continue;
    const original = target[method].bind(target);
    target[method] = (modal) => original(sanitizeModalBuilder(modal));
    guarded.add(method);
  }

  return target;
}

function installInteractionPayloadGuards(interaction) {
  if (!interaction || interaction.__dvlPayloadGuardsInstalled) return interaction;
  installPayloadGuardsOnTarget(interaction, {
    methods: ['reply', 'update', 'followUp', 'editReply'],
    modalMethods: ['showModal']
  });
  installPayloadGuardsOnTarget(interaction.message, { methods: ['edit', 'reply'] });
  installPayloadGuardsOnTarget(interaction.channel, { methods: ['send'] });
  interaction.__dvlPayloadGuardsInstalled = true;
  return interaction;
}

function patchInteractionLocalization(interaction, guildConfig) {
  if (!interaction || interaction.__dvlLocalized) return interaction;
  for (const method of ['reply', 'update', 'followUp', 'editReply']) {
    if (typeof interaction[method] !== 'function') continue;
    const original = interaction[method].bind(interaction);
    interaction[method] = (payload = {}) => {
      const localized = localizePayload(guildConfig, payload);
      const branded = applyGuildPayloadBranding(localized, interaction.guild || null, guildConfig);
      return original(normalizeSystemNoticePayload(branded, guildConfig, { defaultDeleteAfter: TRANSIENT_SYSTEM_DELETE_MS }).payload);
    };
  }
  interaction.__dvlLocalized = true;
  return interaction;
}

async function runCommand(source, command) {
  const ctx = buildCtx(source, command);

  if (command.guildOnly && !ctx.guild) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚫 Command denied', 'This command only works inside a server.')], deleteAfter: TRANSIENT_SYSTEM_DELETE_MS });
  }
  if (!command.dmAllowed && !command.guildOnly && !ctx.guild && source.isChatInputCommand?.()) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚫 Command denied', 'This command does not work here.')], ephemeral: true });
  }
  if (command.ownerOnly && !ownerCheck(ctx.user.id)) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '👑 Owner only', 'This command is restricted to bot owners.')], deleteAfter: TRANSIENT_SYSTEM_DELETE_MS });
  }
  const blacklistEntry = ctx.guildConfig?.moderation?.blacklist?.users?.[ctx.user.id] || null;
  if (ctx.guild && blacklistEntry && !ownerCheck(ctx.user.id)) {
    return ctx.reply({
      embeds: [baseEmbed(ctx.guildConfig, '⛔ Staff blacklist', `You are blocked from using bot commands in this server.\nReason: **${String(blacklistEntry.reason || 'No reason provided.').slice(0, 180)}**`)],
      deleteAfter: TRANSIENT_SYSTEM_DELETE_MS
    });
  }
  if (ctx.guild && command.userPermissions?.length && !ctx.member.permissions.has(command.userPermissions)) {
    if (!hasCustomCommandAccess(ctx.member, command)) {
      return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, '🚫 Permissions', 'You do not have the required permissions for this command.')], deleteAfter: TRANSIENT_SYSTEM_DELETE_MS });
    }
  }

  try {
    await command.execute(ctx);
  } catch (error) {
    console.error(`[command:${command.name}]`, error);
    const payload = { embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, '❌ Error', `An error occurred while running **${command.name}**.`)], deleteAfter: TRANSIENT_SYSTEM_DELETE_MS };
    if (ctx.interaction) {
      if (!ctx.interaction.replied && !ctx.interaction.deferred) await ctx.interaction.reply({ ...payload, ephemeral: true }).catch(() => null);
      else await ctx.interaction.followUp({ ...payload, ephemeral: true }).catch(() => null);
    } else {
      await ctx.channel.send(applyGuildPayloadBranding(payload, ctx.guild, ctx.guildConfig || {})).catch(() => null);
    }
  }
}

function getMessageSpamEntry(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (!client.spamTracker.has(key)) client.spamTracker.set(key, []);
  return client.spamTracker.get(key);
}

async function punishAutomod(message, config, reason, action = 'delete') {
  await message.delete().catch(() => null);
  const notice = await message.channel.send({ embeds: [baseEmbed(config, '🚨 AutoMod', `${message.author}, blocked message: **${reason}**`)] }).catch(() => null);
  if (notice) setTimeout(() => notice.delete().catch(() => null), 7_000).unref?.();
  if (action === 'timeout' && message.member?.moderatable) {
    await message.member.timeout(5 * 60 * 1000, `AutoMod: ${reason}`).catch(() => null);
  }
  await sendLog(message.guild, 'security', 'AutoMod', `${message.author.tag} • ${reason}\nChannel: ${message.channel}`);
}

function extractMessageUrls(content) {
  const rawUrls = String(content || '').match(/https?:\/\/\S+/gi) || [];
  return rawUrls.map((url) => url.replace(/[)>.,!?]+$/g, '')).filter(Boolean);
}

function isAllowedMediaUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    if (/(cdn\.discordapp\.com|media\.discordapp\.net|images-ext-1\.discordapp\.net|images-ext-2\.discordapp\.net|i\.imgur\.com|media\.tenor\.com|c\.tenor\.com|tenor\.com|giphy\.com|media\.giphy\.com|i\.giphy\.com)$/i.test(hostname)) {
      return true;
    }
    return /\.(png|jpe?g|gif|gifv|webp|bmp|svg|mp4|mov|webm)(\?.*)?$/i.test(pathname);
  } catch {
    return /\.(png|jpe?g|gif|gifv|webp|bmp|svg|mp4|mov|webm)(\?.*)?$/i.test(String(url));
  }
}

function messageHasOnlyAllowedMediaUrls(message) {
  const content = String(message.content || '').trim();
  if (!content) return false;
  const cleaned = extractMessageUrls(content);
  if (!cleaned.length) return false;
  return cleaned.every((url) => isAllowedMediaUrl(url));
}

function messageHasAllowedImageContent(message) {
  const attachments = [...(message.attachments?.values?.() || [])];
  if (attachments.some((file) => String(file.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(file.name || '')))) return true;
  if ((message.stickers?.size || 0) > 0) return true;
  return messageHasOnlyAllowedMediaUrls(message);
}

async function handlePicOnly(message) {
  if (!message.guild || message.author?.bot) return false;
  const config = getGuildConfig(message.guild.id);
  const picOnlyChannels = Array.from(new Set([...(config.automod?.picOnlyChannels || []), ...(config.automod?.picOnlySalons || [])]));
  if (!picOnlyChannels.includes(message.channel.id)) return false;

  const prefix = config.prefix || DEFAULT_PREFIX;
  const content = String(message.content || '').trim();
  if (content.startsWith(prefix)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  if (messageHasAllowedImageContent(message)) return false;

  await message.delete().catch(() => null);
  const notice = await message.channel.send({
    content: `${message.author}`,
    embeds: [baseEmbed(config, '🖼️ Image-only channel', 'Only images are allowed here. Send an image attachment, sticker, or direct image link.')]
  }).catch(() => null);
  if (notice) setTimeout(() => notice.delete().catch(() => null), 7_000).unref?.();
  await sendLog(message.guild, 'security', 'Image-only channel', `${message.author.tag} sent a blocked non-image message in ${message.channel}.`);
  return true;
}

async function handleSupportEntryOnly(message) {
  if (!message.guild || message.author?.bot) return false;
  const config = getGuildConfig(message.guild.id);
  const support = config.support || {};
  const isEntryChannel = Boolean(support.entryChannelId && message.channel.id === support.entryChannelId);
  if (!isEntryChannel) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages) || message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) return false;

  const prefix = config.prefix || DEFAULT_PREFIX;
  const content = String(message.content || '').trim();
  const hasFiles = Boolean(message.attachments?.size);
  if (!content && !hasFiles) {
    if (support.entryCommandOnly) {
      await message.delete().catch(() => null);
      return true;
    }
    return false;
  }

  const lowered = content.toLowerCase();
  const allowed = [
    `${prefix}support`,
    `${prefix}helpme`,
    `${prefix}mp`,
    `${prefix}supporthelp`
  ].map((v) => v.toLowerCase());

  const isSupportCommand = content.startsWith(prefix) && allowed.some((cmd) => lowered === cmd || lowered.startsWith(cmd + ' '));
  if (isSupportCommand) return false;

  if ((!content || !content.startsWith(prefix)) && support.enabled && support.channelId) {
    const resolution = resolvePrefixCommand('support');
    if (resolution?.command) {
      const proxyContent = content ? `${prefix}support ${content}`.trim() : `${prefix}support`;
      const proxy = createPrefixedMessageProxy(message, proxyContent);
      await runCommand(proxy, resolution.command);
      return true;
    }
  }

  if (!support.entryCommandOnly) return false;

  await message.delete().catch(() => null);
  const notice = await message.channel.send({
    content: `${message.author}`,
    embeds: [baseEmbed(config, uiLangText(config, '📨 Salon support', '📨 Support channel'), uiLangText(config, `Écris directement ici, utilise \`${prefix}support ton message\`, ou contacte le bot en MP.`, `Write directly here, use \`${prefix}support your message\`, or DM the bot.`))]
  }).catch(() => null);
  if (notice) setTimeout(() => notice.delete().catch(() => null), 7_000).unref?.();
  return true;
}

async function handleAutomod(message) {
  if (!message.guild || message.author.bot) return false;
  const config = getGuildConfig(message.guild.id);
  const mod = config.automod;
  const content = message.content || '';
  if (!content) return false;
  if ((mod.ignoredChannels?.includes(message.channel.id)) || (mod.ignoredSalons?.includes?.(message.channel.id))) return false;
  if (mod.whitelistUserIds?.includes(message.author.id)) return false;
  if (message.member?.roles.cache.some((role) => mod.whitelistRoleIds?.includes(role.id))) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const lowered = content.toLowerCase();

  if (mod.badWordsEnabled && Array.isArray(mod.badWords) && mod.badWords.some((word) => word && lowered.includes(String(word).toLowerCase()))) {
    await punishAutomod(message, config, 'blocked word', 'delete');
    return true;
  }
  if (mod.antiInvite?.enabled && /(discord\.gg|discord\.com\/invite)\//i.test(content)) {
    await punishAutomod(message, config, 'Discord invite link', mod.antiInvite.punish);
    return true;
  }
  if (mod.antiLink?.enabled && /https?:\/\//i.test(content)) {
    if (!messageHasOnlyAllowedMediaUrls(message)) {
      await punishAutomod(message, config, 'link detected', mod.antiLink.punish);
      return true;
    }
  }
  if (mod.antiMention?.enabled) {
    const mentions = message.mentions.users.size + (message.mentions.everyone ? 2 : 0) + message.mentions.roles.size;
    if (mentions >= (mod.antiMention.maxMentions || 5)) {
      await punishAutomod(message, config, 'mention spam', mod.antiMention.punish);
      return true;
    }
  }
  if (mod.antiCaps?.enabled) {
    const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (letters.length >= (mod.antiCaps.minLength || 12)) {
      const upper = letters.split('').filter((char) => char === char.toUpperCase()).length;
      const percent = (upper / letters.length) * 100;
      if (percent >= (mod.antiCaps.percent || 80)) {
        await punishAutomod(message, config, 'too many caps', mod.antiCaps.punish);
        return true;
      }
    }
  }
  if (mod.antiEmojiSpam?.enabled) {
    const emojiCount = (content.match(/<a?:\w+:\d+>|[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
    if (emojiCount >= (mod.antiEmojiSpam.maxEmojis || 8)) {
      await punishAutomod(message, config, 'emoji spam', mod.antiEmojiSpam.punish);
      return true;
    }
  }
  if (mod.antiSpam?.enabled) {
    const timestamps = getMessageSpamEntry(message.guild.id, message.author.id);
    const now = Date.now();
    timestamps.push(now);
    const windowMs = (mod.antiSpam.perSeconds || 6) * 1000;
    while (timestamps.length && now - timestamps[0] > windowMs) timestamps.shift();
    if (timestamps.length >= (mod.antiSpam.maxMessages || 6)) {
      timestamps.length = 0;
      await punishAutomod(message, config, 'message spam', mod.antiSpam.punish);
      return true;
    }
  }
  return false;
}

async function handleAfkReturn(message) {
  if (!message.guild || message.author.bot) return;
  const config = getGuildConfig(message.guild.id);
  let changed = false;
  if (config.afk[message.author.id]) {
    client.store.updateGuild(message.guild.id, (guild) => {
      delete guild.afk[message.author.id];
      return guild;
    });
    changed = true;
  }
  if (changed) {
    const notice = await message.channel.send({ embeds: [baseEmbed(config, '💤 AFK removed', `${message.author}, you are no longer AFK.`)] }).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => null), 5_000).unref?.();
  }

  if (message.mentions.users.size) {
    const lines = [];
    for (const mentioned of message.mentions.users.values()) {
      const afk = config.afk[mentioned.id];
      if (afk) lines.push(`**${mentioned.tag}** is AFK: ${afk.reason} • <t:${Math.floor(afk.since / 1000)}:R>`);
    }
    if (lines.length) {
      const sent = await message.channel.send({ embeds: [baseEmbed(config, '💤 AFK member', lines.join('\n'))] }).catch(() => null);
      if (sent) setTimeout(() => sent.delete().catch(() => null), 8_000).unref?.();
    }
  }
}


async function handleStickyMessage(message) {
  if (!message.guild || message.author?.bot || !message.channel?.isTextBased?.()) return false;
  const config = getGuildConfig(message.guild.id);
  const sticky = config.sticky?.[message.channel.id];
  if (!sticky?.message) return false;
  const prefix = config.prefix || DEFAULT_PREFIX;
  if (String(message.content || '').startsWith(prefix)) return false;
  if (sticky.lastNoticeId === message.id) return false;

  if (sticky.lastNoticeId) {
    await message.channel.messages.fetch(sticky.lastNoticeId)
      .then((msg) => msg.delete().catch(() => null))
      .catch(() => null);
  }

  const notice = await message.channel.send({ embeds: [baseEmbed(config, '📌 Sticky message', sticky.message)] }).catch(() => null);
  client.store.updateGuild(message.guild.id, (guild) => {
    guild.sticky = guild.sticky || {};
    if (!guild.sticky[message.channel.id]) guild.sticky[message.channel.id] = { message: sticky.message };
    guild.sticky[message.channel.id].message = sticky.message;
    guild.sticky[message.channel.id].lastNoticeId = notice?.id || null;
    guild.sticky[message.channel.id].updatedAt = Date.now();
    return guild;
  });
  return Boolean(notice);
}


function getAutoReactRule(guildId, channelId) {
  if (!guildId || !channelId) return null;
  const config = getGuildConfig(guildId);
  const entry = config.autoReact?.channels?.[channelId];
  if (!entry) return null;
  return {
    enabled: entry.enabled !== false,
    emojis: [...new Set((entry.emojis || []).map((emoji) => String(emoji || '').trim()).filter(Boolean))].slice(0, 12),
    mode: ['random', 'all', 'rotate'].includes(entry.mode) ? entry.mode : 'random',
    maxReactions: Math.max(1, Math.min(5, Number(entry.maxReactions) || 1)),
    chance: Math.max(1, Math.min(100, Number(entry.chance) || 100)),
    cooldownSeconds: Math.max(0, Math.min(300, Number(entry.cooldownSeconds) || 0)),
    allowBots: Boolean(entry.allowBots),
    ignoreCommands: entry.ignoreCommands !== false,
    triggerWords: [...new Set((entry.triggerWords || []).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))].slice(0, 12)
  };
}

function toReactionIdentifier(value = '') {
  const raw = String(value || '').trim();
  const match = raw.match(/^<a?:([^:>]+):(\d+)>$/);
  if (match) return `${match[1]}:${match[2]}`;
  return raw;
}

function pickAutoReactEmojis(message, rule) {
  const list = [...(rule?.emojis || [])];
  if (!list.length) return [];
  const count = Math.max(1, Math.min(rule.maxReactions || 1, list.length));
  if (rule.mode === 'all') return list.slice(0, count);
  if (rule.mode === 'rotate') {
    const key = `${message.guild.id}:${message.channel.id}`;
    const start = client.autoReactRotation.get(key) || 0;
    const selected = [];
    for (let i = 0; i < count; i += 1) selected.push(list[(start + i) % list.length]);
    client.autoReactRotation.set(key, (start + count) % list.length);
    return selected;
  }
  const pool = [...list];
  const selected = [];
  while (pool.length && selected.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

async function handleAutoReact(message) {
  if (!message.guild || !message.channel?.isTextBased?.()) return false;
  const rule = getAutoReactRule(message.guild.id, message.channel.id);
  if (!rule?.enabled || !rule.emojis.length) return false;
  if (!rule.allowBots && message.author?.bot) return false;
  const prefix = getGuildConfig(message.guild.id).prefix || DEFAULT_PREFIX;
  const content = String(message.content || '').trim();
  if (rule.ignoreCommands && content.startsWith(prefix)) return false;
  if (rule.triggerWords.length) {
    const lowered = content.toLowerCase();
    if (!rule.triggerWords.some((word) => lowered.includes(word))) return false;
  }
  const cooldownKey = `${message.guild.id}:${message.channel.id}`;
  const now = Date.now();
  const lastTs = client.autoReactCooldowns.get(cooldownKey) || 0;
  if (rule.cooldownSeconds > 0 && now - lastTs < rule.cooldownSeconds * 1000) return false;
  if (Math.random() * 100 > rule.chance) return false;

  const emojis = pickAutoReactEmojis(message, rule);
  if (!emojis.length) return false;
  let reacted = 0;
  for (const emoji of emojis) {
    const identifier = toReactionIdentifier(emoji);
    const ok = await message.react(identifier).then(() => true).catch(() => false);
    if (ok) reacted += 1;
  }
  if (reacted > 0 && rule.cooldownSeconds > 0) client.autoReactCooldowns.set(cooldownKey, now);
  return reacted > 0;
}

async function handlePrefixCommand(message) {
  if (message.author.bot) return false;
  const prefix = message.guild ? (getGuildConfig(message.guild.id).prefix || DEFAULT_PREFIX) : DEFAULT_PREFIX;
  if (!message.content.startsWith(prefix)) return false;
  const trimmed = message.content.slice(prefix.length).trim();
  const parts = trimmed.split(/\s+/);
  const name = (parts.shift() || '').toLowerCase();
  if (!name) return false;

  const resolution = resolvePrefixCommand(name);
  let command = resolution.command;
  let sourceMessage = message;

  if (command && resolution.rewrite) {
    const rewritten = `${prefix}${resolution.rewrite}${parts.length ? ` ${parts.join(' ')}` : ''}`.trim();
    sourceMessage = createPrefixedMessageProxy(message, rewritten);
  }

  if (!command) {
    await replyUnknownPrefixCommand(message, prefix, name);
    return true;
  }

  if (!message.guild && command.name === 'support') {
    const dmContent = parts.join(' ').trim();
    const hasFiles = Boolean(message.attachments?.size);
    if (dmContent || hasFiles) {
      const relayMessage = createPrefixedMessageProxy(message, dmContent);
      await relaySupportDM(relayMessage);
      return true;
    }
  }

  await runCommand(sourceMessage, command);
  return true;
}

function getSupportAttachmentUrls(message) {
  return [...(message.attachments?.values?.() || [])].map((attachment) => attachment.url).filter(Boolean).slice(0, 10);
}

function getSupportFirstImageUrl(message) {
  return getSupportAttachmentUrls(message).find((url) => /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(String(url))) || null;
}

function getRelayFilesFromMessage(message) {
  return [...message.attachments.values()].slice(0, 10).map((attachment, index) => ({
    attachment: attachment.url,
    name: attachment.name || `attachment-${index + 1}`
  }));
}

function getRelayImageUrlFromMessage(message) {
  const attachment = [...message.attachments.values()].find((file) => String(file.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(file.name || file.url || '')));
  return attachment?.url || null;
}

async function relaySupportDM(message) {
  const globalConfig = client.store.getGlobal();
  let guildId = globalConfig.supportRoutes[message.author.id];
  let guild = guildId ? client.guilds.cache.get(guildId) : null;
  let config = guild ? getGuildConfig(guild.id) : null;

  if (!guild || !config?.support?.enabled || !config?.support?.channelId) {
    const candidates = [];
    for (const g of client.guilds.cache.values()) {
      const candidate = getGuildConfig(g.id);
      if (!candidate.support.enabled || !candidate.support.channelId) continue;
      const member = await g.members.fetch(message.author.id).catch(() => null);
      if (member) candidates.push(g);
    }
    if (candidates.length > 1) {
      await message.channel.send({ embeds: [baseEmbed({ embedColor: '#5865F2' }, '📨 Support routing needed', 'Send one message in the server support channel first so I know where to route your DMs. After that, direct DMs will work normally.')] }).catch(() => null);
      return false;
    }
    guild = candidates[0] || null;
    guildId = guild?.id || null;
    config = guild ? getGuildConfig(guild.id) : null;
  }

  if (!guild || !config?.support?.enabled || !config?.support?.channelId) {
    await message.channel.send({ embeds: [baseEmbed({ embedColor: '#5865F2' }, '📨 Support unavailable', 'This bot is not configured for DM support yet. Write once in the server support channel first if needed.')] }).catch(() => null);
    return false;
  }

  const channel = await guild.channels.fetch(config.support.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    await message.channel.send({ embeds: [baseEmbed(config, '📨 Support unavailable', 'The support relay channel is missing or inaccessible.')] }).catch(() => null);
    return false;
  }

  client.store.updateGlobal((global) => {
    global.supportRoutes[message.author.id] = guild.id;
    return global;
  });

  const relayFiles = getRelayFilesFromMessage(message);
  const attachmentLines = [...message.attachments.values()].map((attachment) => `• ${attachment.name || 'file'}\n${attachment.url}`);
  const description = [
    message.content || '*No text content*',
    attachmentLines.length ? `\n**Attachments**\n${attachmentLines.join('\n')}` : ''
  ].join('\n').slice(0, 3800);

  const embed = baseEmbed(config, `📨 Support DM • ${message.author.tag}`, description)
    .addFields(
      { name: 'User', value: `${message.author} • ${message.author.tag}`, inline: false },
      { name: 'User ID', value: message.author.id, inline: true },
      { name: 'Guild', value: guild.name, inline: true }
    )
    .setThumbnail(message.author.displayAvatarURL());
  const imageUrl = getRelayImageUrlFromMessage(message);
  if (imageUrl) embed.setImage(imageUrl);

  const content = config.support.pingRoleId ? `<@&${config.support.pingRoleId}>` : null;
  const sent = await channel.send({ content, embeds: [embed], files: relayFiles }).catch(() => null);
  if (!sent) {
    await message.channel.send({ embeds: [baseEmbed(config, '📨 Support', 'I could not forward your message to staff right now.')] }).catch(() => null);
    return false;
  }

  client.supportMessageLinks.set(sent.id, { userId: message.author.id, guildId: guild.id });
  saveSupportLinks();
  await message.channel.send({ embeds: [baseEmbed(config, '📨 Support', `Your message was sent to **${guild.name}** staff.`)] }).catch(() => null);
  await sendLog(guild, 'support', 'Support DM', `${message.author.tag} sent a DM to the support relay.`, {
    userId: message.author.id,
    fields: [
      { name: 'User', value: `${message.author} • ${message.author.tag}`, inline: false },
      { name: 'User ID', value: message.author.id, inline: true },
      { name: 'Target channel', value: `<#${config.support.channelId}>`, inline: true }
    ]
  });
  return true;
}

async function handleSupportStaffReply(message) {
  if (!message.guild || message.author.bot || !message.reference?.messageId) return false;
  const prefix = getGuildConfig(message.guild.id).prefix || DEFAULT_PREFIX;
  if (message.content.startsWith(prefix)) return false;
  const config = getGuildConfig(message.guild.id);
  if (!config.support.enabled || message.channel.id !== config.support.channelId) return false;
  const route = client.supportMessageLinks.get(message.reference.messageId);
  if (!route) return false;

  const user = await client.users.fetch(route.userId).catch(() => null);
  if (!user) return false;

  const relayFiles = getRelayFilesFromMessage(message);
  const attachmentLines = [...message.attachments.values()].map((attachment) => `• ${attachment.name || 'file'}\n${attachment.url}`);
  const description = [
    message.content || '*No text content*',
    attachmentLines.length ? `\n**Attachments**\n${attachmentLines.join('\n')}` : ''
  ].join('\n').slice(0, 3800);

  const embed = baseEmbed(config, `💬 Staff reply • ${message.guild.name}`, description);
  const imageUrl = getRelayImageUrlFromMessage(message);
  if (imageUrl) embed.setImage(imageUrl);

  await user.send({ embeds: [embed], files: relayFiles }).catch(() => null);
  await message.react('✅').catch(() => null);
  await sendLog(message.guild, 'support', 'Support reply', `${message.author.tag} replied to ${user.tag}.`, {
    userId: message.author.id,
    fields: [
      { name: 'Staff', value: `${message.author} • ${message.author.tag}`, inline: false },
      { name: 'Sent to', value: `${user.tag} (${user.id})`, inline: false },
      message.reference?.messageId ? { name: 'Reply target', value: message.reference.messageId, inline: true } : null
    ].filter(Boolean)
  });
  return true;
}

async function initInviteCache() {
  for (const guild of client.guilds.cache.values()) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) continue;
    client.inviteCache.set(guild.id, new Map(invites.map((invite) => [invite.code, invite.uses || 0])));
  }
}

async function detectUsedInvite(member) {
  const previous = client.inviteCache.get(member.guild.id) || new Map();
  const current = await member.guild.invites.fetch().catch(() => null);
  if (!current) return null;
  client.inviteCache.set(member.guild.id, new Map(current.map((invite) => [invite.code, invite.uses || 0])));
  return current.find((invite) => (invite.uses || 0) > (previous.get(invite.code) || 0)) || null;
}

async function processReminders() {
  const now = Date.now();
  for (const [guildId, guildConfig] of Object.entries(client.store.db.guilds || {})) {
    const reminders = guildConfig.reminders || [];
    if (!reminders.length) continue;
    const due = reminders.filter((reminder) => reminder.dueAt <= now);
    if (!due.length) continue;

    for (const reminder of due) {
      const user = await client.users.fetch(reminder.userId).catch(() => null);
      let sent = false;
      if (reminder.channelId) {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
        if (channel?.isTextBased?.()) {
          await channel.send({ content: `<@${reminder.userId}>`, embeds: [baseEmbed(guildConfig, '⏰ Reminder', reminder.text)] }).catch(() => null);
          sent = true;
        }
      }
      if (!sent && user) {
        await user.send({ embeds: [baseEmbed(guildConfig, '⏰ Reminder', reminder.text)] }).catch(() => null);
      }
    }

    guildConfig.reminders = reminders.filter((reminder) => reminder.dueAt > now);
    client.store.scheduleSave();
  }
}

async function processGiveaways() {
  const now = Date.now();
  for (const [guildId, guildConfig] of Object.entries(client.store.db.guilds || {})) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    for (const giveaway of Object.values(guildConfig.giveaways || {})) {
      if (!giveaway || giveaway.ended || giveaway.paused || giveaway.endsAt > now) continue;
      giveaway.ended = true;
      const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
      const message = channel?.isTextBased?.() ? await channel.messages.fetch(giveaway.messageId).catch(() => null) : null;
      const pool = [...new Set(giveaway.participants || [])];
      const winners = pool.sort(() => Math.random() - 0.5).slice(0, giveaway.winners);
      giveaway.lastWinnerIds = winners;

      if (message) {
        const embed = baseEmbed(guildConfig, '🎉 Giveaway ended', `Prize: **${giveaway.prize}**\nParticipants: **${pool.length}**\n${winners.length ? `Winner(s): ${winners.map((id) => `<@${id}>`).join(', ')}` : 'No winners.'}`)
          .setFooter({ text: `ID: ${giveaway.id}` });
        await message.edit({ embeds: [embed], components: [] }).catch(() => null);
      }
      if (channel?.isTextBased?.()) {
        await channel.send({ embeds: [baseEmbed(guildConfig, '🎊 Giveaway result', winners.length ? `Congrats ${winners.map((id) => `<@${id}>`).join(', ')} for **${giveaway.prize}**.` : `Nobody joined **${giveaway.prize}**.`)] }).catch(() => null);
      }

      await sendLog(guild, 'giveaway', 'Giveaway ended', `${giveaway.id} • ${giveaway.prize} • participants: ${pool.length}`);
      client.store.scheduleSave();
    }
  }
}

async function processTempBans() {
  const now = Date.now();
  for (const [key, dueAt] of client.tempBans.entries()) {
    if (dueAt > now) continue;
    const [guildId, userId] = key.split(':');
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      await guild.members.unban(userId, 'Temporary ban expired').catch(() => null);
      await sendLog(guild, 'moderation', 'Temp ban expired', `User: <@${userId}>`);
    }
    client.tempBans.delete(key);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.applyPresence();
  await initInviteCache();
  if (AUTO_DEPLOY_COMMANDS) {
    try {
      await require('./deploy').deploy(client.meta.clientId, TOKEN, client.meta.guildId, client.commandRegistry);
      console.log('Slash commands deployed.');
    } catch (error) {
      console.error('Failed to auto-deploy slash commands:', error);
    }
  }

  scheduleLoop('reminders', 5_000, processReminders);
  scheduleLoop('giveaways', 15_000, processGiveaways);
  scheduleLoop('tempbans', 20_000, processTempBans);
  scheduleLoop('tiktok', 90_000, () => client.runTikTokCheck());
  scheduleLoop('pdp-rotator', 30_000, () => client.runPdpRotator(false));
  scheduleLoop('stats', 60_000, async () => {
    for (const guild of client.guilds.cache.values()) {
      await ensureGuildStatsChannels(guild, { recreateMissing: true });
      await refreshGuildStats(guild);
      await refreshProgressBoard(guild, { createIfMissing: false });
    }
  });

  for (const guild of client.guilds.cache.values()) {
    await ensureGuildStatsChannels(guild, { recreateMissing: true });
    await refreshGuildStats(guild);
    await refreshProgressBoard(guild, { createIfMissing: false });
  }
});

async function sendWelcomeDirectMessage(member) {
  if (!member?.guild || !member.user) return false;
  const config = getGuildConfig(member.guild.id);
  const welcome = config.welcome || {};
  if (!welcome.dmEnabled) return false;
  const variables = getPanelTextVariables(member.guild, member);
  const payload = createAnnouncementPayload(config, welcome, variables, {
    modeKey: 'dmMode',
    titleKey: 'dmTitle',
    messageKey: 'dmMessage',
    footerKey: 'dmFooter',
    colorKey: 'dmColor',
    imageKey: 'dmImageUrl',
    fallbackTitle: '👋 Welcome to {server}',
    moduleKey: 'welcome-dm'
  });
  const sent = await member.send(payload).catch(() => null);
  return Boolean(sent);
}

client.on(Events.GuildMemberAdd, async (member) => {

  const config = getGuildConfig(member.guild.id);
  const blacklistEntry = config.moderation?.blacklist?.users?.[member.user.id] || null;
  if (blacklistEntry) {
    await member.ban({ reason: `Staff blacklist • ${blacklistEntry.reason || 'blocked user'}`.slice(0, 512) }).catch(() => null);
    await sendLog(member.guild, 'moderation', '⛔ Staff blacklist', `${member.user.tag} tried to join while blacklisted and was banned automatically.`, {
      userId: member.user.id,
      authorName: member.user.tag,
      fields: [
        { name: 'User', value: `${member}`, inline: true },
        { name: 'User ID', value: `\`${member.user.id}\``, inline: true },
        { name: 'Reason', value: String(blacklistEntry.reason || 'No reason.').slice(0, 1024), inline: false }
      ]
    });
    return;
  }
  const ageMinutes = (Date.now() - member.user.createdTimestamp) / 60_000;
  if (config.automod.raidMode?.enabled && ageMinutes < (config.automod.raidMode.joinAgeMinutes || 10080)) {
    await member.kick('Raid mode: account too new').catch(() => null);
    await sendLog(member.guild, 'security', 'Raid mode', `${member.user.tag} was kicked because the account is too new.`);
    return;
  }

  const autoRoleIds = new Set([
    ...(config.roles.autoRoles || []),
    ...(member.user?.bot ? (config.roles.autoRolesBots || []) : (config.roles.autoRolesHumans || []))
  ]);
  for (const roleId of autoRoleIds) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) await member.roles.add(role).catch(() => null);
  }

  await handleMemberMilestoneReward(member);
  await syncStatusRoleForMember(member);

  await sendJoinGhostPing(member).catch(() => null);
  await sendWelcomeDirectMessage(member).catch(() => null);

  if (config.welcome.enabled && config.welcome.channelId) {
    const channel = await member.guild.channels.fetch(config.welcome.channelId).catch(() => null);
    if (channel?.isTextBased?.()) {
      const payload = createAnnouncementPayload(config, config.welcome, getPanelTextVariables(member.guild, member), { fallbackTitle: '👋 Welcome', moduleKey: 'welcome' });
      await channel.send(payload).catch(() => null);
    }
  }

  const invite = await detectUsedInvite(member);
  if (invite?.inviterId) {
    client.store.updateGuild(member.guild.id, (guild) => {
      guild.invites.stats[invite.inviterId] = guild.invites.stats[invite.inviterId] || { count: 0 };
      guild.invites.stats[invite.inviterId].count += 1;
      guild.invites.codes[invite.code] = { uses: invite.uses || 0, inviterId: invite.inviterId };
      return guild;
    });
    await sendLog(member.guild, 'invite', '🎟️ Invite used', `${member} joined using **${invite.code}** from <@${invite.inviterId}>.`, {
      userId: member.user.id,
      authorName: member.user.tag,
      fields: [
        { name: 'Invited member', value: `${member}`, inline: true },
        { name: 'Invite code', value: `\`${invite.code}\``, inline: true },
        { name: 'Inviter', value: `<@${invite.inviterId}>`, inline: true }
      ]
    });
  }

  await sendLog(member.guild, 'memberJoin', '👋 Member join', `${member} joined the server.`, {
    userId: member.user.id,
    authorName: member.user.tag,
    fields: [
      { name: 'Member', value: `${member}`, inline: true },
      { name: 'Account', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Server count', value: String(member.guild.memberCount || 0), inline: true }
    ]
  });
  await refreshGuildStats(member.guild);
  queueProgressBoardRefresh(member.guild.id);
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const config = getGuildConfig(newMember.guild.id);
    const beforeBoost = oldMember?.premiumSinceTimestamp || 0;
    const afterBoost = newMember?.premiumSinceTimestamp || 0;
    if (!beforeBoost && afterBoost) {
      await sendLog(newMember.guild, 'boost', '🚀 Server boost', `${newMember.user.tag} started boosting the server.
Boosts: **${newMember.guild.premiumSubscriptionCount || 0}** • Tier: **${newMember.guild.premiumTier || 0}**`, {
        userId: newMember.user.id,
        authorName: newMember.user.tag,
        fields: [
          { name: 'Booster', value: `${newMember}`, inline: true },
          { name: 'Boosts', value: String(newMember.guild.premiumSubscriptionCount || 0), inline: true },
          { name: 'Tier', value: String(newMember.guild.premiumTier || 0), inline: true }
        ]
      });
      if (config.boost?.enabled && config.boost?.channelId) {
        const channel = await newMember.guild.channels.fetch(config.boost.channelId).catch(() => null);
        if (channel?.isTextBased?.()) {
          const payload = createAnnouncementPayload(config, config.boost, getPanelTextVariables(newMember.guild, newMember), { fallbackTitle: '🚀 New boost', moduleKey: 'boost' });
          await channel.send(payload).catch(() => null);
        }
      }
    } else if (beforeBoost && !afterBoost) {
      await sendLog(newMember.guild, 'boost', '📉 Boost ended', `${newMember} stopped boosting the server.`, {
        userId: newMember.user.id,
        authorName: newMember.user.tag,
        fields: [
          { name: 'Member', value: `${newMember}`, inline: true },
          { name: 'Boosts left', value: String(newMember.guild.premiumSubscriptionCount || 0), inline: true },
          { name: 'Tier', value: String(newMember.guild.premiumTier || 0), inline: true }
        ]
      });
    }

    const oldNick = oldMember.nickname || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.username;
    if (oldNick !== newNick) {
      await sendLog(newMember.guild, 'memberUpdate', '📝 Nickname changed', `${newMember} changed nickname.`, {
        userId: newMember.user.id,
        authorName: newMember.user.tag,
        avatarUrl: newMember.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
        fields: [
          { name: 'Member', value: `${newMember}`, inline: true },
          { name: 'Before', value: clipText(oldNick, 120), inline: true },
          { name: 'After', value: clipText(newNick, 120), inline: true }
        ]
      });
    }

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp || 0;
    const newTimeout = newMember.communicationDisabledUntilTimestamp || 0;
    if (oldTimeout !== newTimeout) {
      if (newTimeout > Date.now()) {
        await sendLog(newMember.guild, 'memberUpdate', '⏳ Member timeout', `${newMember} was timed out.`, {
          userId: newMember.user.id,
          authorName: newMember.user.tag,
          avatarUrl: newMember.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
          fields: [
            { name: 'Member', value: `${newMember}`, inline: true },
            { name: 'Until', value: `<t:${Math.floor(newTimeout / 1000)}:f>`, inline: true }
          ]
        });
      } else if (oldTimeout) {
        await sendLog(newMember.guild, 'memberUpdate', '✅ Timeout removed', `${newMember} is no longer timed out.`, {
          userId: newMember.user.id,
          authorName: newMember.user.tag,
          avatarUrl: newMember.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
          fields: [{ name: 'Member', value: `${newMember}`, inline: true }]
        });
      }
    }

    const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id) && role.id !== newMember.guild.id);
    const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id) && role.id !== newMember.guild.id);
    if (addedRoles.size) {
      await sendLog(newMember.guild, 'memberUpdate', '➕ Roles added', `${newMember} received role updates.`, {
        userId: newMember.user.id,
        authorName: newMember.user.tag,
        avatarUrl: newMember.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
        fields: [
          { name: 'Member', value: `${newMember}`, inline: true },
          { name: 'Added roles', value: `${[...addedRoles.values()].map((role) => role.toString()).join(', ')}`.slice(0, 1024), inline: false }
        ]
      });
    }
    if (removedRoles.size) {
      await sendLog(newMember.guild, 'memberUpdate', '➖ Roles removed', `${newMember} lost role updates.`, {
        userId: newMember.user.id,
        authorName: newMember.user.tag,
        avatarUrl: newMember.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
        fields: [
          { name: 'Member', value: `${newMember}`, inline: true },
          { name: 'Removed roles', value: `${[...removedRoles.values()].map((role) => role.toString()).join(', ')}`.slice(0, 1024), inline: false }
        ]
      });
    }
    await syncVoiceMuteForMember(newMember);
    await enforceVoiceRestrictions(newMember);
    await refreshGuildStats(newMember.guild);
    queueProgressBoardRefresh(newMember.guild.id);
  } catch (error) {
    console.error('[guildMemberUpdate]', error);
  }
});

async function sendLeaveDirectMessage(member) {
  if (!member?.guild || !member.user) return false;
  const config = getGuildConfig(member.guild.id);
  const leave = config.leave || {};
  if (!leave.dmEnabled) return false;
  const variables = getPanelTextVariables(member.guild, member);
  const payload = createAnnouncementPayload(config, leave, variables, {
    modeKey: 'dmMode',
    titleKey: 'dmTitle',
    messageKey: 'dmMessage',
    footerKey: 'dmFooter',
    colorKey: 'dmColor',
    imageKey: 'dmImageUrl',
    fallbackTitle: '👋 You left {server}',
    moduleKey: 'leave-dm'
  });
  const sent = await member.send(payload).catch(() => null);
  return Boolean(sent);
}

client.on(Events.GuildMemberRemove, async (member) => {
  const config = getGuildConfig(member.guild.id);
  await sendLeaveDirectMessage(member).catch(() => null);
  if (config.leave.enabled && config.leave.channelId) {
    const channel = await member.guild.channels.fetch(config.leave.channelId).catch(() => null);
    if (channel?.isTextBased?.()) {
      const payload = createAnnouncementPayload(config, config.leave, getPanelTextVariables(member.guild, member), { fallbackTitle: '👋 Member left', moduleKey: 'leave' });
      await channel.send(payload).catch(() => null);
    }
  }
  await sendLog(member.guild, 'memberLeave', '🚪 Member leave', `${member.user.tag} left the server.`, {
    userId: member.user.id,
    authorName: member.user.tag,
    avatarUrl: member.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
    fields: [
      { name: 'Member', value: `<@${member.id}>`, inline: true },
      { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      { name: 'Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
    ]
  });
  await refreshGuildStats(member.guild);
  queueProgressBoardRefresh(member.guild.id);
});

client.on(Events.PresenceUpdate, async (_oldPresence, newPresence) => {
  try {
    const member = newPresence?.member || (newPresence?.guild && newPresence.userId ? await newPresence.guild.members.fetch(newPresence.userId).catch(() => null) : null);
    if (member) await syncStatusRoleForMember(member, newPresence);
    if (newPresence?.guild) {
      await refreshGuildStats(newPresence.guild);
      queueProgressBoardRefresh(newPresence.guild.id);
    }
  } catch (error) {
    console.error('[presenceUpdate]', error);
  }
});

client.on(Events.InviteCreate, async (invite) => {
  const cache = client.inviteCache.get(invite.guild.id) || new Map();
  cache.set(invite.code, invite.uses || 0);
  client.inviteCache.set(invite.guild.id, cache);
  await sendLog(invite.guild, 'inviteCreate', '➕ Invite created', `A new invite code was created.`, {
    fields: [
      { name: 'Code', value: `\`${invite.code}\``, inline: true },
      { name: 'Channel', value: invite.channel ? `<#${invite.channel.id}>` : 'unknown', inline: true },
      { name: 'Max uses', value: String(invite.maxUses || '∞'), inline: true },
      { name: 'Expires', value: invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'never', inline: true }
    ]
  });
});

client.on(Events.InviteDelete, async (invite) => {
  const cache = client.inviteCache.get(invite.guild.id) || new Map();
  cache.delete(invite.code);
  client.inviteCache.set(invite.guild.id, cache);
  await sendLog(invite.guild, 'inviteDelete', '➖ Invite deleted', `An invite code was deleted.`, {
    fields: [
      { name: 'Code', value: `\`${invite.code}\``, inline: true },
      { name: 'Channel', value: invite.channel ? `<#${invite.channel.id}>` : 'unknown', inline: true }
    ]
  });
});

client.on(Events.ChannelCreate, async (channel) => {
  const guild = channel.guild;
  if (!guild) return;
  const audit = await fetchRecentAuditEntry(guild, AuditLogEvent.ChannelCreate, channel.id);
  await sendLog(guild, 'channelCreate', '➕ Channel created', `${channel}`, {
    fields: [
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Type', value: `**${channelTypeName(channel.type)}**`, inline: true },
      { name: 'Category', value: channel.parentId ? `<#${channel.parentId}>` : 'none', inline: true },
      audit ? { name: 'By', value: formatAuditExecutor(audit), inline: true } : null,
      getAuditReason(audit) ? { name: 'Reason', value: getAuditReason(audit), inline: false } : null
    ].filter(Boolean)
  });
});

client.on(Events.ChannelDelete, async (channel) => {
  const guild = channel.guild;
  if (!guild) return;
  const audit = await fetchRecentAuditEntry(guild, AuditLogEvent.ChannelDelete, channel.id);
  await sendLog(guild, 'channelDelete', '🗑️ Channel deleted', `#${channel.name || 'unknown'}`, {
    fields: [
      { name: 'Name', value: `#${channel.name || 'unknown'}`, inline: true },
      { name: 'Type', value: `**${channelTypeName(channel.type)}**`, inline: true },
      { name: 'Category', value: channel.parentId ? `<#${channel.parentId}>` : 'none', inline: true },
      audit ? { name: 'By', value: formatAuditExecutor(audit), inline: true } : null,
      getAuditReason(audit) ? { name: 'Reason', value: getAuditReason(audit), inline: false } : null
    ].filter(Boolean)
  });
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  const guild = newChannel.guild || oldChannel.guild;
  if (!guild) return;
  const changes = [];
  if (oldChannel.name !== newChannel.name) changes.push(`Name: **${oldChannel.name}** → **${newChannel.name}**`);
  if (oldChannel.parentId !== newChannel.parentId) changes.push(`Category changed.`);
  if (typeof oldChannel.topic !== 'undefined' && oldChannel.topic !== newChannel.topic) changes.push('Topic updated.');
  if (!changes.length) return;
  await sendLog(guild, 'channelUpdate', '🛠️ Channel updated', `${newChannel}`, {
    fields: [
      { name: 'Channel', value: `${newChannel}`, inline: true },
      { name: 'Type', value: `**${channelTypeName(newChannel.type)}**`, inline: true },
      { name: 'Changes', value: changes.join('\n').slice(0, 1024), inline: false }
    ]
  });
});

client.on(Events.RoleCreate, async (role) => {
  const audit = await fetchRecentAuditEntry(role.guild, AuditLogEvent.RoleCreate, role.id);
  await sendLog(role.guild, 'roleCreate', '➕ Role created', `${role}`, {
    fields: [
      { name: 'Role', value: `${role}`, inline: true },
      { name: 'Color', value: `**${role.hexColor}**`, inline: true },
      { name: 'Members', value: String(role.members?.size || 0), inline: true },
      audit ? { name: 'By', value: formatAuditExecutor(audit), inline: true } : null,
      getAuditReason(audit) ? { name: 'Reason', value: getAuditReason(audit), inline: false } : null
    ].filter(Boolean)
  });
});

client.on(Events.RoleDelete, async (role) => {
  const audit = await fetchRecentAuditEntry(role.guild, AuditLogEvent.RoleDelete, role.id);
  await sendLog(role.guild, 'roleDelete', '🗑️ Role deleted', `**${role.name}**`, {
    fields: [
      { name: 'Role name', value: `**${role.name}**`, inline: true },
      { name: 'Color', value: `**${role.hexColor}**`, inline: true },
      audit ? { name: 'By', value: formatAuditExecutor(audit), inline: true } : null,
      getAuditReason(audit) ? { name: 'Reason', value: getAuditReason(audit), inline: false } : null
    ].filter(Boolean)
  });
});

client.on(Events.RoleUpdate, async (oldRole, newRole) => {
  const changes = [];
  if (oldRole.name !== newRole.name) changes.push(`Name: **${oldRole.name}** → **${newRole.name}**`);
  if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: **${oldRole.hexColor}** → **${newRole.hexColor}**`);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('Permissions updated.');
  if (!changes.length) return;
  await sendLog(newRole.guild, 'roleUpdate', '🛠️ Role updated', `${newRole}`, {
    fields: [
      { name: 'Role', value: `${newRole}`, inline: true },
      { name: 'Color', value: `**${newRole.hexColor}**`, inline: true },
      { name: 'Changes', value: changes.join('\n').slice(0, 1024), inline: false }
    ]
  });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  if (!guild || newState.member?.user?.bot) return;
  if (!oldState.channelId && newState.channelId) {
    await sendLog(guild, 'voiceJoin', '🔊 Voice join', `${newState.member} joined <#${newState.channelId}>.`, {
      userId: newState.member.user.id,
      authorName: newState.member.user.tag,
      avatarUrl: newState.member.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
      fields: [
        { name: 'Member', value: `${newState.member}`, inline: true },
        { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
        { name: 'User ID', value: `\`${newState.member.user.id}\``, inline: true }
      ],
      channelId: newState.channelId
    });
  } else if (oldState.channelId && !newState.channelId) {
    await sendLog(guild, 'voiceLeave', '🔈 Voice leave', `${newState.member} left <#${oldState.channelId}>.`, {
      userId: newState.member.user.id,
      authorName: newState.member.user.tag,
      avatarUrl: newState.member.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
      fields: [
        { name: 'Member', value: `${newState.member}`, inline: true },
        { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true },
        { name: 'User ID', value: `\`${newState.member.user.id}\``, inline: true }
      ],
      channelId: oldState.channelId
    });
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    await sendLog(guild, 'voiceMove', '🔁 Voice move', `${newState.member} moved voice channels.`, {
      userId: newState.member.user.id,
      authorName: newState.member.user.tag,
      avatarUrl: newState.member.user.displayAvatarURL?.({ extension: 'png', size: 256 }) || null,
      fields: [
        { name: 'Member', value: `${newState.member}`, inline: true },
        { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
        { name: 'To', value: `<#${newState.channelId}>`, inline: true }
      ],
      channelId: newState.channelId
    });
  }

  const config = getGuildConfig(guild.id);
  const tempChannels = config.voice?.temp?.channels || {};
  const hubChannelId = config.voice?.temp?.hubChannelId || null;

  if (newState.channelId) {
    const blocked = await enforceVoiceRestrictions(newState.member, newState.channelId);
    if (blocked) {
      await sendLog(guild, 'moderation', 'Voice join blocked', `${newState.member.user.tag} tried to join <#${newState.channelId}> while holding the configured voice ban role.`);
      queueVoiceStatsRefresh(guild.id, 1500);
      return;
    }
    await syncVoiceMuteForMember(newState.member);
  }

  if (newState.channelId && hubChannelId && newState.channelId === hubChannelId) {
    const existingId = Object.entries(tempChannels).find(([, entry]) => entry.ownerId === newState.member.id)?.[0];
    let targetChannel = existingId ? await guild.channels.fetch(existingId).catch(() => null) : null;
    if (!targetChannel) targetChannel = await createTempVoiceChannel(guild, newState.member.user, { categoryId: config.voice?.temp?.hubCategoryId || newState.channel?.parentId || null });
    if (targetChannel) {
      await newState.setChannel(targetChannel).catch(() => null);
    }
  }

  const oldChannelId = oldState.channelId;
  if (oldChannelId && tempChannels[oldChannelId]) {
    const oldChannel = oldState.channel || await guild.channels.fetch(oldChannelId).catch(() => null);
    if (oldChannel && oldChannel.members?.size === 0) {
      await oldChannel.delete('Neyora temp voice cleanup').catch(() => null);
      client.store.updateGuild(guild.id, (g) => {
        if (g.voice?.temp?.channels) delete g.voice.temp.channels[oldChannelId];
        return g;
      });
    }
  }

  queueVoiceStatsRefresh(guild.id, 900);
});

client.on(Events.ThreadCreate, async (thread) => {
  const guild = thread.guild;
  if (!guild) return;
  await sendLog(guild, 'threadCreate', 'Thread created', `${thread.name}`);
});

client.on(Events.ThreadDelete, async (thread) => {
  const guild = thread.guild;
  if (!guild) return;
  await sendLog(guild, 'threadDelete', 'Thread deleted', `${thread.name}`);
});

client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`Name: **${oldGuild.name}** → **${newGuild.name}**`);
  if (oldGuild.premiumTier !== newGuild.premiumTier) changes.push(`Boost tier: **${oldGuild.premiumTier}** → **${newGuild.premiumTier}**`);
  if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push('AFK channel updated.');
  if (!changes.length) return;
  await sendLog(newGuild, 'serverUpdate', 'Server updated', changes.join('\n'));
  queueProgressBoardRefresh(newGuild.id);
});

client.on(Events.MessageDelete, async (message) => {
  const snapshot = getGhostPingSnapshot(message) || getGhostPingSnapshotById(message?.id);
  let guild = message.guild || null;
  if (!guild && snapshot?.guildId) guild = client.guilds.cache.get(snapshot.guildId) || await client.guilds.fetch(snapshot.guildId).catch(() => null);
  if (!guild || !snapshot) {
    if (message?.id) client.ghostPingCache.delete(message.id);
    return;
  }
  await handleGhostPingDeleteSnapshot(guild, snapshot);
});

client.on(Events.MessageBulkDelete, async (messages) => {
  for (const message of messages.values()) {
    try {
      const snapshot = getGhostPingSnapshot(message) || getGhostPingSnapshotById(message?.id);
      let guild = message.guild || null;
      if (!guild && snapshot?.guildId) guild = client.guilds.cache.get(snapshot.guildId) || await client.guilds.fetch(snapshot.guildId).catch(() => null);
      if (!guild || !snapshot) {
        if (message?.id) client.ghostPingCache.delete(message.id);
        continue;
      }
      await handleGhostPingDeleteSnapshot(guild, snapshot);
    } catch (error) {
      console.error('[messageBulkDelete]', error);
    }
  }
});

client.on('raw', async (packet) => {
  try {
    if (packet?.t !== 'MESSAGE_DELETE') return;
    const messageId = packet?.d?.id;
    const snapshot = getGhostPingSnapshotById(messageId);
    if (!snapshot || hasRecentGhostPingDeleteSeen(messageId)) return;
    const guildId = packet?.d?.guild_id || snapshot.guildId;
    const guild = guildId ? (client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null)) : null;
    if (!guild) return;
    await handleGhostPingDeleteSnapshot(guild, snapshot);
  } catch (error) {
    console.error('[raw MESSAGE_DELETE]', error);
  }
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (oldMessage.partial) await oldMessage.fetch().catch(() => null);
  if (newMessage.partial) await newMessage.fetch().catch(() => null);
  if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
  const before = getGhostPingSnapshot(oldMessage) || getGhostPingSnapshotById(newMessage.id);
  const after = getGhostPingSnapshot(newMessage);
  const beforeContent = before?.content || '';
  const afterContent = after?.content || '';
  const removedTargets = getRemovedMentionTargets(before, after);
  if (!removedTargets.length && beforeContent === afterContent) {
    cacheGhostPingMessage(newMessage);
    return;
  }
  if (removedTargets.length) {
    await sendGhostPingAlert(newMessage.guild, {
      mode: 'edit',
      message: {
        author: { tag: after?.authorTag || before?.authorTag, id: after?.authorId || before?.authorId },
        channel: { id: after?.channelId || before?.channelId },
        url: after?.url || before?.url || newMessage.url
      },
      targets: removedTargets,
      before: before?.content || '[empty]',
      after: after?.content || '[empty]'
    });
  }
  await sendLog(newMessage.guild, 'messageEdit', '✏️ Message edited', [
    `**Before**`,
    clipText(before?.content || '[empty]', 700),
    '',
    `**After**`,
    clipText(after?.content || '[empty]', 700)
  ].join('\n'), {
    userId: after?.authorId || before?.authorId || newMessage.author.id,
    authorName: after?.authorTag || before?.authorTag || newMessage.author.tag,
    avatarUrl: after?.authorAvatar || before?.authorAvatar || null,
    imageUrl: after?.imageUrl || before?.imageUrl || null,
    fields: [
      { name: 'Author', value: `<@${after?.authorId || before?.authorId || newMessage.author.id}>`, inline: true },
      { name: 'Channel', value: `<#${after?.channelId || newMessage.channel.id}>`, inline: true },
      { name: 'Attachments', value: String((after?.attachmentUrls || before?.attachmentUrls || []).length || 0), inline: true },
      { name: 'Jump', value: newMessage.url || after?.url || before?.url || 'Unavailable', inline: true }
    ],
    channelId: after?.channelId || newMessage.channel.id,
    messageId: newMessage.id,
    url: newMessage.url || after?.url || before?.url || null
  });
  cacheGhostPingMessage(newMessage);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.author) return;

    if (!message.guild) {
      if (message.author.bot) return;
      const handledPrefix = await handlePrefixCommand(message);
      if (!handledPrefix) await relaySupportDM(message);
      return;
    }

    if (message.author.bot) {
      await handleAutoReact(message);
      return;
    }

    cacheGhostPingMessage(message);
    await handleAfkReturn(message);
    if (await handlePicOnly(message)) return;
    if (await handleSupportEntryOnly(message)) return;
    if (await handleAutomod(message)) return;
    if (await handleSupportStaffReply(message)) return;
    const handledPrefix = await handlePrefixCommand(message);
    if (!handledPrefix) {
      await handleAutoReact(message);
      await handleStickyMessage(message);
    }
  } catch (error) {
    console.error('[messageCreate]', error);
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    const message = reaction.message;
    if (!message.guild) return;
    const config = getGuildConfig(message.guild.id);
    const rule = config.roles.reactionRoles?.[message.id];
    if (!rule) return;
    const emoji = normalizeReactionEmoji(reaction);
    const pair = rule.pairs.find((entry) => entry.emoji === emoji || entry.emoji === reaction.emoji.name);
    if (!pair) return;
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    const role = message.guild.roles.cache.get(pair.roleId);
    if (member && role) await member.roles.add(role).catch(() => null);
  } catch (error) {
    console.error('[reactionAdd]', error);
  }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    const message = reaction.message;
    if (!message.guild) return;
    const config = getGuildConfig(message.guild.id);
    const rule = config.roles.reactionRoles?.[message.id];
    if (!rule) return;
    const emoji = normalizeReactionEmoji(reaction);
    const pair = rule.pairs.find((entry) => entry.emoji === emoji || entry.emoji === reaction.emoji.name);
    if (!pair) return;
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    const role = message.guild.roles.cache.get(pair.roleId);
    if (member && role) await member.roles.remove(role).catch(() => null);
  } catch (error) {
    console.error('[reactionRemove]', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  installInteractionPayloadGuards(interaction);
  try {
    if (interaction.guild) patchInteractionLocalization(interaction, getGuildConfig(interaction.guild.id));
    if (interaction.isChatInputCommand()) {
      const command = resolveSlashCommand(interaction);
      if (!command) return interaction.reply({ content: 'Command not found.', ephemeral: true }).catch(() => null);
      await runCommand(interaction, command);
      return;
    }

    if (interaction.isButton()) {

      if (interaction.customId.startsWith('supportpanel:')) {
        return handleSupportPanelInteraction(interaction);
      }

      if (interaction.customId.startsWith('confessionpanel:')) {
        return handleConfessionPanelInteraction(interaction);
      }

      if (interaction.customId.startsWith('customhub:')) {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const guildConfig = getGuildConfig(interaction.guild.id);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ embeds: [baseEmbed(guildConfig, interactionUi(interaction, '🎨 Hub custom', '🎨 Custom hub'), interactionUi(interaction, 'Tu dois avoir Gérer le serveur pour utiliser ce hub.', 'You need Manage Server to use this hub.'))], ephemeral: true }).catch(() => null);
        }
        const [, action, rawSection] = interaction.customId.split(':');
        const section = rawSection || 'home';
        const payload = buildCustomizationPayload(section, guildConfig, guildConfig.prefix || DEFAULT_PREFIX, client.store.getGlobal(), { clientUser: client.user, guild: interaction.guild });
        if (action === 'refresh') return interaction.update(payload).catch(() => null);
        return interaction.update(payload).catch(() => null);
      }

      if (interaction.customId.startsWith('cfgpanel:')) {
        return handleConfigPanelInteraction(interaction);
      }

      if (interaction.customId.startsWith('dashboard:')) {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const page = interaction.customId.split(':')[1] || 'home';
        const guildConfig = getGuildConfig(interaction.guild.id);
        return interaction.update({ embeds: [createDashboardEmbed(guildConfig, interaction.guild, page)], components: createDashboardComponents(page, guildConfig) });
      }

      if (interaction.customId.startsWith('dashboardquick:')) {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const [, action, pageRaw] = interaction.customId.split(':');
        const page = pageRaw || 'home';
        const guildConfig = getGuildConfig(interaction.guild.id);
        if (action === 'refresh') {
          return interaction.update({ embeds: [createDashboardEmbed(guildConfig, interaction.guild, page)], components: createDashboardComponents(page, guildConfig) });
        }
        if (action === 'help') {
          const info = getHelpTargetInfo(client, 'Categories');
          return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, 'Categories', 1)], components: createHelpComponents(info.category || 'Categories', 1, info.totalPages || 1, guildConfig) });
        }
        if (action === 'support') {
          return interaction.update({ embeds: [createSupportPanelEmbed(guildConfig, interaction.guild, client.meta.defaultPrefix || '+', interaction.channel)], components: createSupportPanelComponents(guildConfig) });
        }
        if (action === 'logs') {
          return interaction.update({ embeds: [createLogsPanelEmbed(guildConfig, 1)], components: createLogsPanelComponents(guildConfig, 1) });
        }
        if (action === 'progress') {
          return interaction.update({ embeds: [createServerProgressEmbed(guildConfig, interaction.guild)], components: createServerProgressComponents() });
        }
      }
      
      if (interaction.customId === 'trophy:refresh') {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const freshConfig = getGuildConfig(interaction.guild.id);
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild.progress = guild.progress || { enabled: false, channelId: null, messageId: null, lastUpdatedAt: null };
          if (interaction.channelId) guild.progress.channelId = interaction.channelId;
          if (interaction.message?.id) guild.progress.messageId = interaction.message.id;
          guild.progress.lastUpdatedAt = Date.now();
          return guild;
        });
        return interaction.update({ embeds: [createServerProgressEmbed(freshConfig, interaction.guild)], components: createServerProgressComponents() });
      }
      if (interaction.customId.startsWith('helpnav:')) {
        const [, category, pageRaw] = interaction.customId.split(':');
        const guildConfig = interaction.guild ? getGuildConfig(interaction.guild.id) : { embedColor: '#5865F2', prefix: DEFAULT_PREFIX };
        const info = getHelpTargetInfo(client, category || 'Home');
        const page = Math.max(1, Number(pageRaw) || 1);
        return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, category || 'Home', page)], components: createHelpComponents(info.category || 'Home', page, info.totalPages || 1, guildConfig) });
      }
      if (interaction.customId.startsWith('help:')) {
        const [, categoryRaw, pageRaw] = interaction.customId.split(':');
        const category = categoryRaw || 'Home';
        const page = Math.max(1, Number(pageRaw) || 1);
        const guildConfig = interaction.guild ? getGuildConfig(interaction.guild.id) : { embedColor: '#5865F2', prefix: DEFAULT_PREFIX };
        const info = getHelpTargetInfo(client, category);
        return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, category, page)], components: createHelpComponents(info.category || category, page, info.totalPages || 1, guildConfig) });
      }

      if (interaction.customId.startsWith('logpanel:')) {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const config = getGuildConfig(interaction.guild.id);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ embeds: [baseEmbed(config, uiLangText(config, 'Panel logs', 'Logs panel'), uiLangText(config, 'Tu dois avoir Gérer le serveur pour utiliser ce panel.', 'You need Manage Server to use this panel.'))], ephemeral: true });
        }

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const arg = parts[2] || null;
        const page = Math.max(1, Number(parts[3] || parts[2] || 1) || 1);

        if (action === 'master') {
          client.store.updateGuild(interaction.guild.id, (guild) => {
            guild.logs.enabled = arg === 'on';
            return guild;
          });
        } else if (action === 'setdefault') {
          client.store.updateGuild(interaction.guild.id, (guild) => {
            guild.logs.channels = guild.logs.channels || { default: null, messages: null, members: null, moderation: null, voice: null, server: null, social: null };
            guild.logs.channels.default = interaction.channelId;
            guild.logs.channelId = interaction.channelId;
            guild.logs.enabled = true;
            return guild;
          });
        } else if (action === 'setroute') {
          client.store.updateGuild(interaction.guild.id, (guild) => {
            guild.logs.channels = guild.logs.channels || { default: null, messages: null, members: null, moderation: null, voice: null, server: null, social: null };
            guild.logs.channels[arg] = interaction.channelId;
            guild.logs.enabled = true;
            return guild;
          });
        } else if (action === 'clearroute') {
          client.store.updateGuild(interaction.guild.id, (guild) => {
            guild.logs.channels = guild.logs.channels || { default: null, messages: null, members: null, moderation: null, voice: null, server: null, social: null };
            delete guild.logs.channels[arg];
            return guild;
          });
        } else if (action === 'type') {
          client.store.updateGuild(interaction.guild.id, (guild) => {
            guild.logs.types[arg] = guild.logs.types?.[arg] === false ? true : false;
            return guild;
          });
        }

        const fresh = getGuildConfig(interaction.guild.id);
        const nextPage = action === 'page' ? Math.max(1, Number(arg) || 1) : page;
        return interaction.update({
          embeds: [createLogsPanelEmbed(fresh, nextPage)],
          components: createLogsPanelComponents(fresh, nextPage)
        });
      }

      if (interaction.customId === 'voicehub:create') {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        const guildConfig = getGuildConfig(interaction.guild.id);
        const existingId = Object.entries(guildConfig.voice?.temp?.channels || {}).find(([, entry]) => entry.ownerId === interaction.user.id)?.[0];
        let channel = existingId ? await interaction.guild.channels.fetch(existingId).catch(() => null) : null;
        if (!channel) channel = await createTempVoiceChannel(interaction.guild, interaction.user, { categoryId: guildConfig.voice?.temp?.hubCategoryId || null });
        if (!channel) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'I could not create the temp voice channel.')], ephemeral: true });
        if (interaction.member?.voice) await interaction.member.voice.setChannel(channel).catch(() => null);
        return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice ready', `Your temp voice channel is ready: ${channel}`)], ephemeral: true });
      }

      if (interaction.customId.startsWith('voicectl:')) {
        const [, action, extra] = interaction.customId.split(':');
        const guildConfig = getGuildConfig(interaction.guild.id);

        if (action === 'refresh') {
          return interaction.update({ embeds: [createVoicePanelEmbed(guildConfig)], components: createVoicePanelComponents() });
        }

        if (action === 'rename') {
          const state = await getManagedTempVoiceState(interaction);
          if (state.error) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', state.error)], ephemeral: true });
          const modal = new ModalBuilder().setCustomId(`voicectl:rename:${state.channel.id}`).setTitle('Rename temp voice');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('value')
                .setLabel('New voice channel name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
                .setValue(String(state.channel.name || '').slice(0, 100))
            )
          );
          return interaction.showModal(modal);
        }

        if (action === 'transfer' || action === 'kick') {
          const state = await getManagedTempVoiceState(interaction);
          if (state.error) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', state.error)], ephemeral: true });
          return interaction.reply({
            embeds: [baseEmbed(guildConfig, `🔊 Voice ${action === 'transfer' ? 'transfer crown' : 'kick member'}`, `Select a member from ${state.channel} below.`)],
            components: createVoiceManageSelectRows(state.channel.id),
            ephemeral: true
          });
        }

        const state = await getManagedTempVoiceState(interaction, { allowClaim: action === 'claim' });
        if (state.error) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', state.error)], ephemeral: true });

        if (action === 'claim') {
          if (!state.canClaim) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', `Only <@${state.entry.ownerId}> can manage this temp voice right now.`)], ephemeral: true });
          await setTempVoiceOwner(interaction.guild, state.channel, interaction.user.id);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '👑 Voice crown', `You are now the owner of ${state.channel}.`)], ephemeral: true });
        }

        if (action === 'delete') {
          await state.channel.delete(`Temp voice deleted by ${interaction.user.tag}`).catch(() => null);
          client.store.updateGuild(interaction.guild.id, (g) => {
            if (g.voice?.temp?.channels) delete g.voice.temp.channels[state.channel.id];
            return g;
          });
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🗑️ Temp voice deleted', 'Your temp voice channel was deleted.')], ephemeral: true });
        }

        if (action === 'lock') {
          await state.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => null);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔒 Temp voice', `${state.channel} is now locked.`)], ephemeral: true });
        }
        if (action === 'unlock') {
          await state.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true }).catch(() => null);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔓 Temp voice', `${state.channel} is now unlocked.`)], ephemeral: true });
        }
        if (action === 'hide') {
          await state.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false }).catch(() => null);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🙈 Temp voice', `${state.channel} is now hidden.`)], ephemeral: true });
        }
        if (action === 'show') {
          await state.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true }).catch(() => null);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '👁️ Temp voice', `${state.channel} is now visible.`)], ephemeral: true });
        }
        if (action === 'limitup' || action === 'limitdown') {
          const nextLimit = Math.max(0, Math.min(99, (state.channel.userLimit || 0) + (action === 'limitup' ? 1 : -1)));
          await state.channel.setUserLimit(nextLimit).catch(() => null);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔢 Temp voice limit', `New user limit for ${state.channel}: **${nextLimit || 'unlimited'}**.`)], ephemeral: true });
        }
        if (action === 'info') {
          return interaction.reply({ embeds: [baseEmbed(guildConfig, 'ℹ️ Temp voice info', [
            `**Channel:** ${state.channel}`,
            `**Owner:** <@${state.entry.ownerId}>`,
            `**Members:** ${state.channel.members.size}`,
            `**Limit:** ${state.channel.userLimit || 'unlimited'}`
          ].join('\n'))], ephemeral: true });
        }
      }

      if (interaction.customId.startsWith('giveaway:join:')) {
        const giveawayId = interaction.customId.split(':')[2];
        const config = getGuildConfig(interaction.guild.id);
        const giveaway = config.giveaways[giveawayId];
        if (!giveaway || giveaway.ended) return interaction.reply({ embeds: [baseEmbed(config, 'Giveaway', 'That giveaway is ended or missing.')], ephemeral: true });
        client.store.updateGuild(interaction.guild.id, (guild) => {
          const target = guild.giveaways[giveawayId];
          if (!target) return guild;
          target.participants = target.participants || [];
          if (target.participants.includes(interaction.user.id)) target.participants = target.participants.filter((id) => id !== interaction.user.id);
          else target.participants.push(interaction.user.id);
          return guild;
        });
        const joined = getGuildConfig(interaction.guild.id).giveaways[giveawayId].participants.includes(interaction.user.id);
        return interaction.reply({ embeds: [baseEmbed(config, '🎁 Giveaway', joined ? 'You joined the giveaway.' : 'You left the giveaway.')], ephemeral: true });
      }

      if (interaction.customId.startsWith('rolepanel:')) {
        const [, panelId, roleId] = interaction.customId.split(':');
        const config = getGuildConfig(interaction.guild.id);
        const panel = config.roles.rolePanels[panelId];
        if (!panel) return interaction.reply({ embeds: [baseEmbed(config, 'Role panel', 'Panel not found.')], ephemeral: true });
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ embeds: [baseEmbed(config, 'Role panel', 'Role not found.')], ephemeral: true });
        const member = interaction.member;
        const hasRole = member.roles.cache.has(role.id);
        if (hasRole) await member.roles.remove(role).catch(() => null);
        else await member.roles.add(role).catch(() => null);
        return interaction.reply({ embeds: [baseEmbed(config, '🎭 Role panel', hasRole ? `${role} removed.` : `${role} added.`)], ephemeral: true });
      }

      if (interaction.customId.startsWith('embed:')) {
        const [, field, draftId] = interaction.customId.split(':');
        const draft = client.embedDrafts.get(draftId);
        const guildConfig = getGuildConfig(interaction.guild.id);
        if (!draft) return interaction.reply({ content: uiLangText(guildConfig, 'Brouillon introuvable.', 'Draft not found.'), ephemeral: true });
        if (draft.ownerId !== interaction.user.id) return interaction.reply({ content: uiLangText(guildConfig, 'Ce builder ne t’appartient pas.', 'This builder is not yours.'), ephemeral: true });

        if (field === 'send') {
          const channel = await client.channels.fetch(draft.channelId).catch(() => null);
          if (!channel?.isTextBased?.()) return interaction.reply({ content: uiLangText(guildConfig, 'Salon introuvable.', 'Channel not found.'), ephemeral: true });
          const embed = buildEmbedDraftPreview(guildConfig, draft).setFooter({ text: draft.embed.footer || 'Neyora' });
          await channel.send({ embeds: [embed] }).catch(() => null);
          client.embedDrafts.delete(draftId);
          return interaction.update({ embeds: [baseEmbed(guildConfig, uiLangText(guildConfig, 'Embed envoyé', 'Embed sent'), uiLangText(guildConfig, 'Ton embed a bien été envoyé.', 'Your embed was sent successfully.'))], components: [] });
        }

        if (field === 'cancel') {
          client.embedDrafts.delete(draftId);
          return interaction.update({ embeds: [baseEmbed(guildConfig, uiLangText(guildConfig, 'Studio fermé', 'Studio closed'), uiLangText(guildConfig, 'Le builder a été fermé.', 'The builder has been closed.'))], components: [] });
        }

        if (field === 'copy') {
          const ui = parseEmbedFieldUi('copy', guildConfig);
          return interaction.showModal(createSingleFieldModal(guildConfig, `embedmodal:copy:${draftId}`, {
            title: uiLangText(guildConfig, 'Copier un embed', 'Copy an embed'),
            label: ui.label,
            value: '',
            placeholder: uiLangText(guildConfig, 'Même salon : 123... ou colle un lien complet', 'Same channel: 123... or paste a full link'),
            style: TextInputStyle.Short,
            maxLength: 200,
            required: true
          }));
        }

        const ui = parseEmbedFieldUi(field, guildConfig);
        return interaction.showModal(createSingleFieldModal(guildConfig, `embedmodal:${field}:${draftId}`, {
          title: uiLangText(guildConfig, `Modifier ${ui.label}`, `Edit ${ui.label}`),
          label: ui.label,
          value: String(draft.embed[field] || '').slice(0, ui.maxLength || 4000),
          placeholder: ui.placeholder,
          style: ui.style,
          maxLength: ui.maxLength,
          required: false
        }));
      }
    }

    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId.startsWith('cfgpanelstats:')) {
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: interactionUi(interaction, 'Gérer le serveur est requis.', 'Manage Server is required.'), ephemeral: true }).catch(() => null);
        const type = interaction.customId.split(':')[1] || 'members';
        const targetChannelId = interaction.values?.[0];
        const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
        if (!targetChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(targetChannel.type)) {
          return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📊 Liaison stats', '📊 Stats bind'), uiLangText(getGuildConfig(interaction.guild.id), 'Choisis un salon vocal valide.', 'Pick a valid voice channel.'))], ephemeral: true }).catch(() => null);
        }
        const defaultLabels = {
          members: '👥・Membres : {count}',
          online: '🌐・En ligne : {count}',
          voice: '🔊・Vocal : {count}'
        };
        await interaction.deferUpdate().catch(() => null);
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
          guild.stats.enabled = true;
          guild.stats.channels = guild.stats.channels || {};
          guild.stats.labels = guild.stats.labels || {};
          guild.stats.channels[type] = targetChannel.id;
          if (!guild.stats.labels[type]) guild.stats.labels[type] = defaultLabels[type] || defaultLabels.members;
          guild.stats.lockChannels = true;
          return guild;
        });
        await refreshGuildStats(interaction.guild);
        return interaction.editReply({
          embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📊 Liaison stats', '📊 Stats bind'), uiLangText(getGuildConfig(interaction.guild.id), `Compteur **${type}** lié à ${targetChannel}.`, `Bound **${type}** counter to ${targetChannel}.`))],
          components: []
        }).catch(() => null);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId.startsWith('voicectl:transferselect:') || interaction.customId.startsWith('voicectl:kickselect:')) {
        const [, action, channelId] = interaction.customId.split(':');
        const guildConfig = getGuildConfig(interaction.guild.id);
        const state = await getManagedTempVoiceState(interaction);
        if (state.error) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', state.error)], ephemeral: true });
        if (state.channel.id !== channelId) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'That control menu belongs to another temp voice channel.')], ephemeral: true });
        const targetId = interaction.values[0];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember || targetMember.voice?.channelId !== state.channel.id) {
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'That member is not inside your temp voice channel.')], ephemeral: true });
        }
        if (action === 'transferselect') {
          await setTempVoiceOwner(interaction.guild, state.channel, targetMember.id);
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '👑 Voice crown', `Transferred ownership of ${state.channel} to ${targetMember}.`)], ephemeral: true });
        }
        if (targetMember.id === interaction.user.id) {
          return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'You cannot kick yourself with the panel.')], ephemeral: true });
        }
        await targetMember.voice.disconnect(`Kicked from temp voice by ${interaction.user.tag}`).catch(() => null);
        return interaction.reply({ embeds: [baseEmbed(guildConfig, '🦶 Temp voice', `Disconnected ${targetMember} from ${state.channel}.`)], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('voicectl:rename:')) {
        const channelId = interaction.customId.split(':')[2];
        const guildConfig = getGuildConfig(interaction.guild.id);
        const state = await getManagedTempVoiceState(interaction);
        if (state.error) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', state.error)], ephemeral: true });
        if (state.channel.id !== channelId) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'That rename modal belongs to another temp voice channel.')], ephemeral: true });
        const value = interaction.fields.getTextInputValue('value').trim().slice(0, 100);
        if (!value) return interaction.reply({ embeds: [baseEmbed(guildConfig, '🔊 Voice panel', 'Voice channel name cannot be empty.')], ephemeral: true });
        await state.channel.setName(value).catch(() => null);
        return interaction.reply({ embeds: [baseEmbed(guildConfig, '✏️ Temp voice', `Renamed your temp voice to **${value}**.`)], ephemeral: true });
      }

      if (interaction.customId.startsWith('confessionpanelmodal:')) {
        const field = interaction.customId.split(':')[1] || 'title';
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: interactionUi(interaction, 'Gérer le serveur est requis.', 'Manage Server is required.'), ephemeral: true }).catch(() => null);
        const parsed = normalizeOptionalModalValue(interaction.fields.getTextInputValue('value'), { guildConfig: getGuildConfig(interaction.guild.id), field });
        if (!parsed.ok) return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '🤫 Confessions', '🤫 Confessions'), parsed.error)], ephemeral: true }).catch(() => null);
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild.confessions = guild.confessions || JSON.parse(JSON.stringify(DEFAULT_GUILD.confessions || {}));
          if (field === 'color') guild.confessions.color = parsed.value || DEFAULT_GUILD.confessions?.color || '#EC4899';
          else guild.confessions.title = parsed.value || DEFAULT_GUILD.confessions?.title || '🤫 Confession anonyme';
          return guild;
        });
        const fresh = getGuildConfig(interaction.guild.id);
        if (interaction.message?.editable) {
          await interaction.message.edit({ embeds: [createConfessionPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', interaction.channel)], components: createConfessionPanelComponents(fresh) }).catch(() => null);
        }
        return interaction.reply({
          embeds: [createFieldSavedEmbed(fresh, uiLangText(fresh, '🤫 Confessions', '🤫 Confessions'), {
            scope: uiLangText(fresh, 'Confessions', 'Confessions'),
            label: field === 'color' ? uiLangText(fresh, 'Couleur', 'Color') : uiLangText(fresh, 'Titre', 'Title'),
            field,
            value: field === 'color' ? (parsed.value || DEFAULT_GUILD.confessions?.color || '#EC4899') : (parsed.value || DEFAULT_GUILD.confessions?.title || '🤫 Confession anonyme'),
            cleared: false,
            next: ['`confessions panel`', '`confessions test`']
          })],
          ephemeral: true
        }).catch(() => null);
      }

      if (interaction.customId.startsWith('cfgpanelsticky:')) {
        const channelId = interaction.customId.split(':')[1];
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true }).catch(() => null);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: interactionUi(interaction, 'Gérer le serveur est requis.', 'Manage Server is required.'), ephemeral: true }).catch(() => null);
        const targetChannel = channelId ? (interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null)) : null;
        if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📌 Sticky', '📌 Sticky'), uiLangText(getGuildConfig(interaction.guild.id), 'Ce salon est invalide ou n’existe plus.', 'That channel is invalid or no longer exists.'))], ephemeral: true }).catch(() => null);
        const parsed = normalizeOptionalModalValue(interaction.fields.getTextInputValue('value'), { guildConfig: getGuildConfig(interaction.guild.id), field: 'message' });
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild.sticky = guild.sticky || {};
          if (!parsed.value) {
            delete guild.sticky[channelId];
            return guild;
          }
          const current = guild.sticky[channelId] || {};
          guild.sticky[channelId] = {
            ...current,
            message: parsed.value,
            updatedAt: Date.now()
          };
          return guild;
        });
        const fresh = getGuildConfig(interaction.guild.id);
        if (interaction.message?.editable) {
          await interaction.message.edit(buildSafeConfigPanelPayload(fresh, interaction.guild, 'automation', interaction.channel)).catch(() => null);
        }
        return interaction.reply({
          embeds: [createFieldSavedEmbed(fresh, '📌 Sticky', {
            scope: `${targetChannel}`,
            label: uiLangText(fresh, 'Message sticky', 'Sticky message'),
            field: 'message',
            value: parsed.value,
            cleared: parsed.cleared,
            next: ['`sticky off`', '`panel automation`']
          })],
          ephemeral: true
        }).catch(() => null);
      }

      if (interaction.customId.startsWith('cfgpanelmodal:')) {
        const [, moduleKeyRaw, field] = interaction.customId.split(':');
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true });
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: interactionUi(interaction, 'Gérer le serveur est requis.', 'Manage Server is required.'), ephemeral: true });
        const moduleKey = ['welcome', 'welcome-dm', 'leave', 'leave-dm', 'boost'].includes(moduleKeyRaw) ? moduleKeyRaw : 'welcome';
        const metaMap = {
          welcome: { root: 'welcome', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' },
          'welcome-dm': { root: 'welcome', titleKey: 'dmTitle', messageKey: 'dmMessage', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl' },
          leave: { root: 'leave', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' },
          'leave-dm': { root: 'leave', titleKey: 'dmTitle', messageKey: 'dmMessage', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl' },
          boost: { root: 'boost', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' }
        };
        const meta = metaMap[moduleKey] || metaMap.welcome;
        const keyMap = { title: meta.titleKey, message: meta.messageKey, footer: meta.footerKey, color: meta.colorKey, image: meta.imageKey };
        const targetKey = keyMap[field] || meta.messageKey;
        const parsed = normalizeOptionalModalValue(interaction.fields.getTextInputValue('value'), { guildConfig: getGuildConfig(interaction.guild.id), field });
        if (!parsed.ok) return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📝 Smart panel', '📝 Smart panel'), parsed.error)], ephemeral: true }).catch(() => null);
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild[meta.root] = guild[meta.root] || JSON.parse(JSON.stringify(DEFAULT_GUILD[meta.root] || {}));
          guild[meta.root][targetKey] = parsed.value || null;
          return guild;
        });
        const fresh = getGuildConfig(interaction.guild.id);
        const currentChannel = interaction.channel;
        if (interaction.message?.editable) {
          await interaction.message.edit(buildSafeConfigPanelPayload(fresh, interaction.guild, moduleKey, currentChannel)).catch(() => null);
        }
        const { meta: uiMeta, scope } = parseTextModuleUi(moduleKey, fresh);
        return interaction.reply({
          embeds: [createFieldSavedEmbed(fresh, uiLangText(fresh, '📝 Smart panel', '📝 Smart panel'), {
            scope,
            label: parseFieldUi(uiMeta.label, field, fresh).label,
            field,
            value: parsed.value,
            cleared: parsed.cleared,
            next: ['`panel texts`', '`text test`']
          })],
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith('supportpanelmodal:')) {
        const [, field] = interaction.customId.split(':');
        if (!interaction.guild) return interaction.reply({ content: interactionUi(interaction, 'Serveur uniquement.', 'Guild only.'), ephemeral: true });
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: interactionUi(interaction, 'Gérer le serveur est requis.', 'Manage Server is required.'), ephemeral: true });

        const keyMap = { title: 'promptTitle', message: 'promptMessage', footer: 'promptFooter', color: 'promptColor', image: 'promptImageUrl' };
        const targetKey = keyMap[field] || 'promptMessage';
        const parsed = normalizeOptionalModalValue(interaction.fields.getTextInputValue('value'), { guildConfig: getGuildConfig(interaction.guild.id), field });
        if (!parsed.ok) return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), uiLangText(getGuildConfig(interaction.guild.id), '📨 Prompt support', '📨 Support prompt'), parsed.error)], ephemeral: true }).catch(() => null);
        client.store.updateGuild(interaction.guild.id, (guild) => updateSupportPrompt(guild, (support) => {
          support[targetKey] = parsed.value || null;
        }));
        const fresh = getGuildConfig(interaction.guild.id);
        const currentChannel = interaction.channel;
        if (interaction.message?.editable) {
          await interaction.message.edit({ embeds: [createSupportPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents(fresh) }).catch(() => null);
        }
        return interaction.reply({
          embeds: [createFieldSavedEmbed(fresh, uiLangText(fresh, '📨 Prompt support', '📨 Support prompt'), {
            scope: uiLangText(fresh, 'Prompt support', 'Support prompt'),
            label: parseFieldUi(uiLangText(fresh, 'Prompt support', 'Support prompt'), field, fresh).label,
            field,
            value: parsed.value,
            cleared: parsed.cleared,
            next: ['`support panel`', '`support preview`']
          })],
          ephemeral: true
        });
      }
      if (interaction.customId.startsWith('embedmodal:')) {
        const [, field, draftId] = interaction.customId.split(':');
        const draft = client.embedDrafts.get(draftId);
        const guildConfig = getGuildConfig(interaction.guild.id);
        if (!draft) return interaction.reply({ content: uiLangText(guildConfig, 'Brouillon introuvable.', 'Draft not found.'), ephemeral: true });
        if (draft.ownerId !== interaction.user.id) return interaction.reply({ content: uiLangText(guildConfig, 'Ce builder ne t’appartient pas.', 'This builder is not yours.'), ephemeral: true });

        if (field === 'copy') {
          const raw = interaction.fields.getTextInputValue('value').trim();
          const found = await fetchEmbedSourceMessage(interaction.guild, raw, interaction.channel?.id || draft.channelId);
          if (!found) return interaction.reply({ content: uiLangText(guildConfig, 'Message introuvable. Utilise un ID du même salon ou un lien Discord complet.', 'Message not found. Use an ID from the same channel or a full Discord link.'), ephemeral: true });
          const sourceEmbed = found.message.embeds?.[0];
          if (!sourceEmbed) return interaction.reply({ content: uiLangText(guildConfig, 'Ce message n’a aucun embed à copier.', 'That message has no embed to copy.'), ephemeral: true });
          importEmbedIntoDraft(draft, sourceEmbed);
          const channel = await client.channels.fetch(draft.channelId).catch(() => null);
          const message = channel?.isTextBased?.() && draft.messageId ? await channel.messages.fetch(draft.messageId).catch(() => null) : null;
          if (message) await message.edit({ embeds: [buildEmbedDraftPreview(guildConfig, draft)], components: buildEmbedDraftComponents(draftId, guildConfig) }).catch(() => null);
          return interaction.reply({
            embeds: [createFieldSavedEmbed(guildConfig, uiLangText(guildConfig, '📥 Studio embed', '📥 Embed studio'), {
              scope: uiLangText(guildConfig, 'Brouillon', 'Draft'),
              label: uiLangText(guildConfig, 'Source copiée', 'Copied source'),
              field: 'copy',
              value: `#${found.message.id}`,
              cleared: false,
              next: ['`send`', '`copy`']
            })],
            ephemeral: true
          });
        }

        const parsed = normalizeOptionalModalValue(interaction.fields.getTextInputValue('value'), { guildConfig, field });
        if (!parsed.ok) return interaction.reply({ embeds: [baseEmbed(guildConfig, uiLangText(guildConfig, '✦ Studio embed', '✦ Embed studio'), parsed.error)], ephemeral: true }).catch(() => null);
        draft.embed[field] = parsed.value || null;

        const channel = await client.channels.fetch(draft.channelId).catch(() => null);
        const message = channel?.isTextBased?.() && draft.messageId ? await channel.messages.fetch(draft.messageId).catch(() => null) : null;

        if (message) await message.edit({ embeds: [buildEmbedDraftPreview(guildConfig, draft)], components: buildEmbedDraftComponents(draftId, guildConfig) }).catch(() => null);
        return interaction.reply({
          embeds: [createFieldSavedEmbed(guildConfig, uiLangText(guildConfig, '✦ Studio embed', '✦ Embed studio'), {
            scope: uiLangText(guildConfig, 'Brouillon', 'Draft'),
            label: parseEmbedFieldUi(field, guildConfig).label,
            field,
            value: parsed.value,
            cleared: parsed.cleared,
            next: ['`send`', '`copy`']
          })],
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('[interactionCreate]', error);
    if (interaction.isRepliable()) {
      const payload = { content: 'An error occurred.', ephemeral: true };
      if (!interaction.replied && !interaction.deferred) await interaction.reply(payload).catch(() => null);
      else await interaction.followUp(payload).catch(() => null);
    }
  }
});

process.on('unhandledRejection', (error) => console.error('[unhandledRejection]', error));
process.on('uncaughtException', (error) => console.error('[uncaughtException]', error));

client.login(TOKEN);
