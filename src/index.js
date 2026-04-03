
require('dotenv').config();

const crypto = require('crypto');
const {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
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
const { createCommands, createHelpEmbed, createHelpComponents, createLogsPanelEmbed, createLogsPanelComponents, createVoicePanelEmbed, createVoicePanelComponents, createServerProgressEmbed, createServerProgressComponents, createDashboardEmbed, createDashboardComponents, createConfigPanelEmbed, createConfigPanelComponents, createSupportPanelEmbed, createSupportPanelComponents, createSupportPromptPayload, getHelpTargetInfo } = require('./core/commands');
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
  parseUserArgument
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
  clean: { mode: 'embed', footer: 'DvL', color: null, image: null, title: null },
  premium: { mode: 'embed', footer: 'DvL • premium', color: '#8B5CF6', image: null, titlePrefix: '✦ ' },
  minimal: { mode: 'plain', footer: null, color: null, image: null, title: null }
};

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
client.commandMap = new Map();
client.commandRegistry.forEach((command) => {
  client.commandMap.set(command.name, command);
  for (const alias of command.aliases || []) client.commandMap.set(alias, command);
});
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

function ownerCheck(userId) {
  return OWNER_IDS.has(userId);
}

function getGuildConfig(guildId) {
  return client.store.getGuild(guildId);
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

function createAnnouncementPayload(guildConfig, source, variables, options = {}) {
  const titleKey = options.titleKey || 'title';
  const messageKey = options.messageKey || 'message';
  const modeKey = options.modeKey || 'mode';
  const footerKey = options.footerKey || 'footer';
  const colorKey = options.colorKey || 'color';
  const imageKey = options.imageKey || 'imageUrl';
  const fallbackTitle = options.fallbackTitle || '';
  const message = fillTemplate(source?.[messageKey] || '', variables).trim();
  const title = fillTemplate(source?.[titleKey] || fallbackTitle, variables).trim();
  const footerRaw = source?.[footerKey];
  const footer = footerRaw === null ? '' : fillTemplate(footerRaw ?? 'DvL', variables).trim();
  const imageUrl = fillTemplate(source?.[imageKey] || '', variables).trim();
  const mode = normalizeAnnouncementMode(source?.[modeKey]);
  if (mode === 'plain') {
    const content = [title ? `**${title}**` : '', message, /^https?:\/\//i.test(imageUrl) ? imageUrl : '']
      .filter(Boolean)
      .join('\n');
    return { content: content || 'No content.' };
  }
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(source?.[colorKey] || guildConfig?.embedColor || '#5865F2'))
    .setTimestamp();
  if (title) embed.setTitle(title);
  if (message) embed.setDescription(message);
  if (footer) embed.setFooter({ text: footer });
  if (/^https?:\/\//i.test(imageUrl)) embed.setImage(imageUrl);
  return { embeds: [embed] };
}


function getPanelTextMeta(moduleKey = 'welcome') {
  const safe = ['welcome', 'leave', 'leave-dm', 'boost'].includes(moduleKey) ? moduleKey : 'welcome';
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

function getPanelTextVariables(guild, user) {
  return {
    user: user ? `<@${user.id}>` : '<@0>',
    userTag: user?.tag || 'Unknown#0000',
    server: guild?.name || 'Server',
    memberCount: guild?.memberCount || 0,
    boostCount: guild?.premiumSubscriptionCount || 0,
    boostTier: guild?.premiumTier || 0
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
    fallbackTitle: meta.fallbackTitle
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
  if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
  const config = getGuildConfig(interaction.guild.id);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [baseEmbed(config, 'Support panel', 'You need Manage Server to use this panel.')], ephemeral: true }).catch(() => null);
  }

  const parts = interaction.customId.split(':');
  const action = parts[1] || 'refresh';
  const field = parts[2] || null;
  const currentChannel = interaction.channel;
  const refreshPanel = async () => {
    const fresh = getGuildConfig(interaction.guild.id);
    return interaction.message.edit({ embeds: [createSupportPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents() }).catch(() => null);
  };
  const sendEphemeral = (title, description) => interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), title, description)], ephemeral: true }).catch(() => null);

  if (action === 'refresh') {
    return interaction.update({ embeds: [createSupportPanelEmbed(config, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents() });
  }

  if (action === 'toggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.enabled = !guild.support.enabled;
      if (guild.support.enabled && !guild.support.channelId && currentChannel?.isTextBased?.()) guild.support.channelId = currentChannel.id;
      enabled = guild.support.enabled;
      return guild;
    });
    await sendEphemeral('📨 Support relay', `Support relay is now **${enabled ? 'enabled' : 'disabled'}**.`);
    return refreshPanel();
  }

  if (action === 'relayhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📨 Support panel', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.enabled = true;
      guild.support.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('📨 Support relay', `Relay channel set to ${currentChannel}.`);
    return refreshPanel();
  }

  if (action === 'entryhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📨 Support panel', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.entryChannelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('📍 Support member channel', `Members should now use ${currentChannel} for support.`);
    return refreshPanel();
  }

  if (action === 'restrict') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.restrictToEntry = !guild.support.restrictToEntry;
      enabled = guild.support.restrictToEntry;
      return guild;
    });
    const fresh = getGuildConfig(interaction.guild.id);
    await sendEphemeral('🚧 Support restriction', enabled ? `Members must now use support in ${fresh.support?.entryChannelId ? `<#${fresh.support.entryChannelId}>` : 'the configured support channel'}.` : 'Members can now use support from any channel again.');
    return refreshPanel();
  }

  if (action === 'mode') {
    let nextMode = 'embed';
    client.store.updateGuild(interaction.guild.id, (guild) => updateSupportPrompt(guild, (support) => {
      nextMode = String(support.promptMode || 'embed').toLowerCase() === 'plain' ? 'embed' : 'plain';
      support.promptMode = nextMode;
    }));
    await sendEphemeral('🎨 Support prompt', `Prompt now uses **${nextMode}** mode.`);
    return refreshPanel();
  }

  if (action === 'reset') {
    client.store.updateGuild(interaction.guild.id, (guild) => resetSupportPrompt(guild));
    await sendEphemeral('♻️ Support prompt', 'Support prompt style was reset to default values.');
    return refreshPanel();
  }

  if (action === 'clear') {
    if (!field || !['entry', 'relay'].includes(field)) return interaction.reply({ content: 'Invalid support panel action.', ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      if (field === 'entry') guild.support.entryChannelId = null;
      if (field === 'relay') guild.support.channelId = null;
      return guild;
    });
    await sendEphemeral('🧹 Support panel', field === 'entry' ? 'Support member channel cleared.' : 'Support relay channel cleared.');
    return refreshPanel();
  }

  if (action === 'send') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetId = currentChannel?.isTextBased?.() ? currentChannel.id : fresh.support?.entryChannelId;
    const targetChannel = targetId ? await interaction.guild.channels.fetch(targetId).catch(() => null) : null;
    if (!targetChannel?.isTextBased?.()) {
      return interaction.reply({ embeds: [baseEmbed(fresh, '📨 Support prompt', 'Open this panel inside the public support channel, or set a member channel first.')], ephemeral: true }).catch(() => null);
    }
    const payload = createSupportPromptPayload(fresh, interaction.guild, client.meta.defaultPrefix || '+', targetChannel);
    const sent = await targetChannel.send(payload).catch(() => null);
    await sendEphemeral('📤 Support prompt', sent ? `Support prompt sent in ${targetChannel}.` : 'I could not send the support prompt.');
    return refreshPanel();
  }

  if (action === 'edit') {
    const safeField = ['title', 'message', 'footer', 'color', 'image'].includes(field) ? field : 'message';
    const source = config.support || {};
    const keyMap = { title: 'promptTitle', message: 'promptMessage', footer: 'promptFooter', color: 'promptColor', image: 'promptImageUrl' };
    const labelMap = {
      title: 'Support prompt title',
      message: 'Support prompt message',
      footer: 'Support prompt footer',
      color: 'Support prompt color (#RRGGBB)',
      image: 'Support prompt image URL'
    };
    const value = String(source?.[keyMap[safeField]] || '').slice(0, 4000);
    const modal = new ModalBuilder().setCustomId(`supportpanelmodal:${safeField}`).setTitle(`Edit ${labelMap[safeField]}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(labelMap[safeField])
          .setStyle(safeField === 'message' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(safeField === 'message' ? 2000 : 400)
          .setValue(value)
      )
    );
    return interaction.showModal(modal);
  }

  return interaction.reply({ content: 'Invalid support panel action.', ephemeral: true }).catch(() => null);
}

async function handleConfigPanelInteraction(interaction) {
  if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
  const config = getGuildConfig(interaction.guild.id);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [baseEmbed(config, 'Smart panel', 'You need Manage Server to use this panel.')], ephemeral: true }).catch(() => null);
  }

  const parts = interaction.customId.split(':');
  const action = parts[1];
  const arg = parts[2] || null;
  const extra = parts[3] || null;
  const currentChannel = interaction.channel;
  const refreshPanel = async (page) => {
    const fresh = getGuildConfig(interaction.guild.id);
    return interaction.message.edit({ embeds: [createConfigPanelEmbed(fresh, interaction.guild, page, currentChannel)], components: createConfigPanelComponents(page, currentChannel?.id) }).catch(() => null);
  };
  const sendEphemeral = (title, description) => interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), title, description)], ephemeral: true }).catch(() => null);

  if (action === 'page' || action === 'refresh') {
    const page = arg || 'home';
    return interaction.update({ embeds: [createConfigPanelEmbed(config, interaction.guild, page, currentChannel)], components: createConfigPanelComponents(page, currentChannel?.id) });
  }

  if (action === 'openlogs') {
    return interaction.update({ embeds: [createLogsPanelEmbed(config, 1)], components: createLogsPanelComponents(config, 1) });
  }

  if (action === 'supportopen') {
    return interaction.update({ embeds: [createSupportPanelEmbed(config, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents() });
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
    await sendEphemeral('🧰 Repair', [
      `**Scope:** ${report.scope}`,
      `**Fixed:** ${report.fixed.length}`,
      `**Cleared:** ${report.cleared.length}`,
      `**Notes:** ${report.notes.length}`,
      report.fixed.length ? '' : null,
      ...report.fixed.slice(0, 6).map((line) => `• ${line}`),
      ...report.cleared.slice(0, 6).map((line) => `• ${line}`),
      ...report.notes.slice(0, 6).map((line) => `• ${line}`)
    ].filter(Boolean).join('\n'));
    return refreshPanel('repair');
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
    const page = arg || 'welcome';
    return interaction.update({ embeds: [createConfigPanelEmbed(config, interaction.guild, page, currentChannel)], components: createConfigPanelComponents(page, currentChannel?.id) });
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
      const value = String(source?.[targetKey] || '').slice(0, 4000);
      const labelMap = {
        title: `${meta.label} title`,
        message: `${meta.label} message`,
        footer: `${meta.label} footer`,
        color: `${meta.label} color (#RRGGBB)`,
        image: `${meta.label} image URL`
      };
      const modal = new ModalBuilder().setCustomId(`cfgpanelmodal:${moduleKey}:${field}`).setTitle(`Edit ${labelMap[field] || field}`.slice(0, 45));
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('value')
            .setLabel(labelMap[field] || field)
            .setStyle(field === 'message' ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(field === 'message' ? 2000 : 400)
            .setValue(value)
        )
      );
      return interaction.showModal(modal);
    }

    if (action === 'textreset') {
      client.store.updateGuild(interaction.guild.id, (guild) => resetPanelTextModule(guild, moduleKey));
      await sendEphemeral('♻️ Text reset', `${meta.label} style was reset to the default values.`);
      return refreshPanel(moduleKey);
    }

    if (action === 'texthere') {
      if (!meta.hasChannel) return interaction.reply({ embeds: [baseEmbed(config, '📝 Text panel', 'This module sends in DMs, not in a server channel.')], ephemeral: true }).catch(() => null);
      if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📝 Text panel', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
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
      await sendEphemeral('🎨 Text mode', `${meta.label} now uses **${nextMode}** mode.`);
      return refreshPanel(moduleKey);
    }
  }


  if (action === 'textpreset') {
    const moduleKey = arg || 'welcome';
    const presetKey = ['clean', 'premium', 'minimal'].includes(extra) ? extra : 'clean';
    const metaMap = {
      welcome: { root: 'welcome', enabledKey: 'enabled', modeKey: 'mode', titleKey: 'title', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl', channelKey: 'channelId' },
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
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📌 Smart panel', 'Open the panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    const sent = await currentChannel.send({ embeds: [createConfigPanelEmbed(getGuildConfig(interaction.guild.id), interaction.guild, 'home', currentChannel)], components: createConfigPanelComponents('home', currentChannel.id) }).catch(() => null);
    if (!sent) return interaction.reply({ embeds: [baseEmbed(config, '📌 Smart panel', 'I could not deploy the panel in this channel.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.panel = guild.panel || {};
      guild.panel.deployedChannelId = currentChannel.id;
      guild.panel.deployedMessageId = sent.id;
      guild.panel.lastDeployedAt = Date.now();
      return guild;
    });
    return interaction.reply({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), '📌 Smart panel', `Control center deployed in ${currentChannel}. Pin that message for staff.`)], ephemeral: true }).catch(() => null);
  }

  if (action === 'supporttoggle') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.enabled = !guild.support.enabled;
      if (guild.support.enabled && !guild.support.channelId && currentChannel?.isTextBased?.()) guild.support.channelId = currentChannel.id;
      enabled = guild.support.enabled;
      return guild;
    });
    await sendEphemeral('📨 Support relay', `Support relay is now **${enabled ? 'enabled' : 'disabled'}**.`);
    return refreshPanel('support');
  }

  if (action === 'supportrelayhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📨 Support', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.enabled = true;
      guild.support.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('📨 Support relay', `Relay channel set to ${currentChannel}.`);
    return refreshPanel('support');
  }

  if (action === 'supportentryhere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📨 Support', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.entryChannelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('📍 Support entry', `Members should use ${currentChannel} for \`${client.meta.defaultPrefix || '+'}support\`.`);
    return refreshPanel('support');
  }

  if (action === 'supportrestrict') {
    let enabled = false;
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.support = guild.support || { enabled: false, channelId: null, pingRoleId: null, entryChannelId: null, restrictToEntry: false };
      guild.support.restrictToEntry = !guild.support.restrictToEntry;
      enabled = guild.support.restrictToEntry;
      return guild;
    });
    await sendEphemeral('🚧 Support restriction', enabled ? 'Members are now restricted to the configured support channel.' : 'Members can now use support from any channel again.');
    return refreshPanel('support');
  }

  if (action === 'supportsend') {
    const fresh = getGuildConfig(interaction.guild.id);
    const targetId = fresh.support?.entryChannelId || currentChannel?.id;
    const targetChannel = targetId ? (interaction.guild.channels.cache.get(targetId) || await interaction.guild.channels.fetch(targetId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(fresh, '📨 Support prompt', 'Set a valid support member channel first.')], ephemeral: true }).catch(() => null);
    const payload = createSupportPromptPayload(fresh, interaction.guild, client.meta.defaultPrefix || '+', targetChannel);
    const sent = await targetChannel.send(payload).catch(() => null);
    await sendEphemeral('📤 Support prompt', sent ? `Support prompt sent in ${targetChannel}.` : 'I could not send the support prompt.');
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
    await sendEphemeral('👻 Ghost ping', `Ghost ping is now **${enabled ? 'enabled' : 'disabled'}**.${enabled && currentChannel?.isTextBased?.() ? `\nChannel: ${currentChannel}` : ''}`);
    return refreshPanel('security');
  }

  if (action === 'ghosthere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '👻 Ghost ping', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.automod = guild.automod || {};
      guild.automod.ghostPing = guild.automod.ghostPing || { enabled: false, channelId: null };
      guild.automod.ghostPing.enabled = true;
      guild.automod.ghostPing.channelId = currentChannel.id;
      return guild;
    });
    await sendEphemeral('👻 Ghost ping', `Joining members will be pinged in ${currentChannel}, then the message will delete after 2 seconds.`);
    return refreshPanel('security');
  }

  if (action === 'ghosttest') {
    const fresh = getGuildConfig(interaction.guild.id);
    const testChannelId = fresh.automod?.ghostPing?.channelId || currentChannel?.id;
    const testChannel = testChannelId ? (interaction.guild.channels.cache.get(testChannelId) || await interaction.guild.channels.fetch(testChannelId).catch(() => null)) : null;
    if (!testChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(fresh, '👻 Ghost ping test', 'No valid ghost ping channel is configured yet. Use **Ghost here** first.')], ephemeral: true }).catch(() => null);
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
    await sendEphemeral('👻 Ghost ping test', sent ? `Test ping sent in ${testChannel}. It will delete after 2 seconds.` : `I could not send a test ping in ${testChannel}. Check **Send Messages**.`);
    return refreshPanel('home');
  }

  if (action === 'logshere') {
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '🧾 Logs', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
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
    if (!currentChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '🏆 Trophy board', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
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
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '⚡ Auto-react', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
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

  if (action === 'stickyoff') {
    const targetChannelId = arg && arg !== '0' ? arg : currentChannel?.id;
    const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
    if (!targetChannel?.isTextBased?.()) return interaction.reply({ embeds: [baseEmbed(config, '📌 Sticky', 'Open this panel inside a text channel first.')], ephemeral: true }).catch(() => null);
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.sticky = guild.sticky || {};
      delete guild.sticky[targetChannel.id];
      return guild;
    });
    await sendEphemeral('📌 Sticky', `Sticky message disabled in ${targetChannel}.`);
    return refreshPanel('automation');
  }

  if (action === 'statsmembers' || action === 'statsonline' || action === 'statsvoice') {
    const type = action === 'statsmembers' ? 'members' : action === 'statsonline' ? 'online' : 'voice';
    const targetChannelId = arg && arg !== '0' ? arg : currentChannel?.id;
    const targetChannel = targetChannelId ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)) : null;
    if (!targetChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(targetChannel.type)) {
      return interaction.reply({ embeds: [baseEmbed(config, '📊 Stats bind', 'Open this panel inside a **voice channel** if you want to bind it as a counter.')], ephemeral: true }).catch(() => null);
    }
    const defaultLabels = {
      members: '👥・Membres : {count}',
      online: '🌐・En ligne : {count}',
      voice: '🔊・Vocal : {count}'
    };
    client.store.updateGuild(interaction.guild.id, (guild) => {
      guild.stats = guild.stats || { enabled: false, categoryId: null, channels: {}, labels: {}, lockChannels: true };
      guild.stats.enabled = true;
      guild.stats.channels = guild.stats.channels || {};
      guild.stats.labels = guild.stats.labels || {};
      guild.stats.channels[type] = targetChannel.id;
      if (!guild.stats.labels[type]) guild.stats.labels[type] = defaultLabels[type];
      guild.stats.lockChannels = true;
      return guild;
    });
    await refreshGuildStats(interaction.guild);
    await sendEphemeral('📊 Stats bind', `Bound **${type}** counter to ${targetChannel}.`);
    return refreshPanel('channels');
  }

  return interaction.reply({ embeds: [baseEmbed(config, 'Smart panel', 'Unknown action.')] , ephemeral: true }).catch(() => null);
}


async function getManagedTempVoiceState(interaction, options = {}) {
  const member = interaction.member;
  const guild = interaction.guild;
  if (!guild || !member?.voice?.channelId) return { error: 'Join your temp voice channel first.' };
  const channel = member.voice.channel || await guild.channels.fetch(member.voice.channelId).catch(() => null);
  if (!channel) return { error: 'Your voice channel could not be found.' };
  const config = getGuildConfig(guild.id);
  const entry = config.voice?.temp?.channels?.[channel.id];
  if (!entry) return { error: 'That channel is not one of DvL\'s temp voice channels.' };
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
  const voice = guild?.voiceStates?.cache
    ? guild.voiceStates.cache.filter((state) => state?.channelId && !state?.member?.user?.bot).size
    : 0;
  return { members, online, voice };
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
  const category = stats.categoryId ? (guild.channels.cache.get(stats.categoryId) || await guild.channels.fetch(stats.categoryId).catch(() => null)) : null;
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
        reason: 'DvL stats auto-repair'
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
  const labels = config.stats.labels || {};
  const live = getGuildLiveStats(guild);
  const targets = {
    members: { channelId: config.stats.channels?.members, name: buildGuildStatChannelName(labels.members || '👥・Membres : {count}', live.members) },
    online: { channelId: config.stats.channels?.online, name: buildGuildStatChannelName(labels.online || '🌐・En ligne : {count}', live.online) },
    voice: { channelId: config.stats.channels?.voice, name: buildGuildStatChannelName(labels.voice || '🔊・Vocal : {count}', live.voice) }
  };
  for (const entry of Object.values(targets)) {
    if (!entry.channelId) continue;
    const channel = guild.channels.cache.get(entry.channelId) || await guild.channels.fetch(entry.channelId).catch(() => null);
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
    if (wants('security')) {
      const automod = ensureGuildSectionShape(g, 'automod', DEFAULT_GUILD.automod);
      automod.whitelistUserIds = Array.from(new Set((automod.whitelistUserIds || []).map(String).filter(Boolean)));
      automod.whitelistRoleIds = Array.from(new Set((automod.whitelistRoleIds || []).map(String).filter(Boolean)));
      automod.ignoredChannels = Array.from(new Set((automod.ignoredChannels || []).map(String).filter(Boolean)));
      automod.picOnlyChannels = Array.from(new Set((automod.picOnlyChannels || []).map(String).filter(Boolean)));
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

  const added = await member.roles.add(role, `DvL member milestone reward #${currentCount}`).then(() => true).catch(() => false);
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
  await member.voice.disconnect('DvL voice ban enforcement').catch(() => null);
  return true;
}

async function syncVoiceMuteForMember(member) {
  if (!member?.guild || member.user?.bot || !member.voice?.channelId) return false;
  const config = getGuildConfig(member.guild.id);
  const moderation = config.voice?.moderation || {};
  if (!moderation.muteRoleId) return false;
  if (!member.roles.cache.has(moderation.muteRoleId)) return false;
  if (member.voice.serverMute) return true;
  await member.voice.setMute(true, 'DvL voice mute role enforcement').catch(() => null);
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
    support: '#6366F1',
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

async function buildLogEmbed(guild, config, type, title, description, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(options.color || getLogTypeColor(type, config?.embedColor || '#5865F2')))
    .setTitle(title)
    .setDescription(String(description || '').slice(0, 4096) || 'No details.')
    .setFooter({ text: options.footerText || `DvL • logs • ${type}` })
    .setTimestamp();

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
        .filter((field) => field && field.name && field.value)
        .slice(0, 10)
        .map((field) => ({
          name: String(field.name).slice(0, 256),
          value: String(field.value).slice(0, 1024),
          inline: Boolean(field.inline)
        }))
    : [];
  if (fields.length) embed.addFields(fields);
  return embed;
}

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
      ]
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

async function syncStatusRoleForMember(member, presenceLike = null) {
  if (!member?.guild || member.user?.bot) return false;
  const config = getGuildConfig(member.guild.id);
  const rule = config.roles?.statusRole || {};
  if (!rule.enabled || !rule.roleId || !rule.matchText) return false;

  const role = member.guild.roles.cache.get(rule.roleId) || await member.guild.roles.fetch(rule.roleId).catch(() => null);
  if (!role || !member.manageable) return false;

  const me = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
  if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) return false;

  const customStatus = getCustomStatusText(presenceLike || member);
  const haystack = customStatus.toLowerCase();
  const needle = String(rule.matchText).toLowerCase();
  const matches = rule.mode === 'exact' ? haystack === needle : haystack.includes(needle);
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
      if (interaction) {
        const base = { ...payload };
        if (!interaction.replied && !interaction.deferred) sent = await interaction.reply({ ...base, fetchReply: true });
        else sent = await interaction.followUp(base);
      } else {
        sent = await channel.send(payload);
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
      return parseChannelArgument(args[argIndex], guild);
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
      const usage = [
        `Usage: \`${prefix}${command.usage || command.name}\``,
        command.description ? `What it does: ${command.description}` : null,
        extra || null,
        command.aliases?.length ? `Aliases: ${command.aliases.map((alias) => `\`${prefix}${alias}\``).join(', ')}` : null
      ].filter(Boolean).join('\n');
      const payload = { embeds: [baseEmbed(guildConfig, '❌ Invalid usage', usage)] };
      if (interaction) {
        return this.reply({ ...payload, ephemeral: true });
      }
      const sent = await channel.send(payload).catch(() => null);
      if (sent) setTimeout(() => sent.delete().catch(() => null), 10_000).unref?.();
      return sent;
    }
  };

  return ctx;
}

function resolveSlashCommand(interaction) {
  const root = interaction.commandName;
  const sub = interaction.options.getSubcommand(false);
  return client.commandRegistry.find((command) => command.slash?.root === root && command.slash?.sub === sub) || null;
}

async function runCommand(source, command) {
  const ctx = buildCtx(source, command);

  if (command.guildOnly && !ctx.guild) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Command denied', 'This command only works inside a server.')] });
  }
  if (!command.dmAllowed && !command.guildOnly && !ctx.guild && source.isChatInputCommand?.()) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Command denied', 'This command does not work here.')], ephemeral: true });
  }
  if (command.ownerOnly && !ownerCheck(ctx.user.id)) {
    return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Owner only', 'This command is restricted to bot owners.')] });
  }
  if (ctx.guild && command.userPermissions?.length && !ctx.member.permissions.has(command.userPermissions)) {
    if (!hasCustomCommandAccess(ctx.member, command)) {
      return ctx.reply({ embeds: [baseEmbed(ctx.guildConfig, 'Permissions', 'You do not have the required permissions for this command.')] });
    }
  }

  try {
    await command.execute(ctx);
  } catch (error) {
    console.error(`[command:${command.name}]`, error);
    const payload = { embeds: [baseEmbed(ctx.guildConfig || { embedColor: '#5865F2' }, 'Error', `An error occurred while running **${command.name}**.`)] };
    if (ctx.interaction) {
      if (!ctx.interaction.replied && !ctx.interaction.deferred) await ctx.interaction.reply({ ...payload, ephemeral: true }).catch(() => null);
      else await ctx.interaction.followUp({ ...payload, ephemeral: true }).catch(() => null);
    } else {
      await ctx.channel.send(payload).catch(() => null);
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

function messageHasAllowedImageContent(message) {
  const attachments = [...(message.attachments?.values?.() || [])];
  if (attachments.some((file) => String(file.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(file.name || '')))) return true;
  if ((message.stickers?.size || 0) > 0) return true;

  const content = String(message.content || '').trim();
  if (!content) return false;
  const urls = content.match(/https?:\/\/\S+/gi) || [];
  if (!urls.length) return false;
  const cleaned = urls.map((url) => url.replace(/[)>.,!?]+$/g, ''));
  if (!cleaned.length) return false;
  return cleaned.every((url) => /(cdn\.discordapp\.com|media\.discordapp\.net|i\.imgur\.com|images-ext-1\.discordapp\.net|images-ext-2\.discordapp\.net|tenor\.com|giphy\.com|media\.tenor\.com)/i.test(url) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url));
}

async function handlePicOnly(message) {
  if (!message.guild || message.author?.bot) return false;
  const config = getGuildConfig(message.guild.id);
  const picOnlyChannels = config.automod?.picOnlyChannels || [];
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

async function handleAutomod(message) {
  if (!message.guild || message.author.bot) return false;
  const config = getGuildConfig(message.guild.id);
  const mod = config.automod;
  const content = message.content || '';
  if (!content) return false;
  if (mod.ignoredChannels?.includes(message.channel.id)) return false;
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
    await punishAutomod(message, config, 'link detected', mod.antiLink.punish);
    return true;
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
  const parts = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = (parts.shift() || '').toLowerCase();
  if (!name) return false;
  const command = client.commandMap.get(name);
  if (!command) return false;
  await runCommand(message, command);
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
    guild = client.guilds.cache.find((g) => {
      const candidate = getGuildConfig(g.id);
      return candidate.support.enabled && candidate.support.channelId;
    }) || null;
    guildId = guild?.id || null;
    config = guild ? getGuildConfig(guild.id) : null;
  }

  if (!guild || !config?.support?.enabled || !config?.support?.channelId) {
    await message.channel.send({ embeds: [baseEmbed({ embedColor: '#5865F2' }, '📨 Support unavailable', 'This bot is not configured for DM support yet.')] }).catch(() => null);
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
  if (!sent) return false;

  client.supportMessageLinks.set(sent.id, { userId: message.author.id, guildId: guild.id });
  saveSupportLinks();
  await sendLog(guild, 'support', 'Support DM', `${message.author.tag} sent a DM to the support relay.`);
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
  await sendLog(message.guild, 'support', 'Support reply', `${message.author.tag} replied to ${user.tag}.`);
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

client.on(Events.GuildMemberAdd, async (member) => {
  const config = getGuildConfig(member.guild.id);
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

  if (config.welcome.enabled && config.welcome.channelId) {
    const channel = await member.guild.channels.fetch(config.welcome.channelId).catch(() => null);
    if (channel?.isTextBased?.()) {
      const payload = createAnnouncementPayload(config, config.welcome, {
        user: member.toString(),
        userTag: member.user.tag,
        server: member.guild.name,
        memberCount: member.guild.memberCount,
        boostCount: member.guild.premiumSubscriptionCount || 0,
        boostTier: member.guild.premiumTier || 0
      }, { fallbackTitle: '👋 Welcome' });
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
          const payload = createAnnouncementPayload(config, config.boost, {
            user: newMember.toString(),
            userTag: newMember.user.tag,
            server: newMember.guild.name,
            memberCount: newMember.guild.memberCount,
            boostCount: newMember.guild.premiumSubscriptionCount || 0,
            boostTier: newMember.guild.premiumTier || 0
          }, { fallbackTitle: '🚀 New boost' });
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
      await sendLog(newMember.guild, 'memberUpdate', 'Nickname changed', `${newMember.user.tag}
Before: **${oldNick}**
After: **${newNick}**`);
    }

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp || 0;
    const newTimeout = newMember.communicationDisabledUntilTimestamp || 0;
    if (oldTimeout !== newTimeout) {
      if (newTimeout > Date.now()) {
        await sendLog(newMember.guild, 'memberUpdate', 'Member timeout', `${newMember.user.tag} was timed out until <t:${Math.floor(newTimeout / 1000)}:f>.`);
      } else if (oldTimeout) {
        await sendLog(newMember.guild, 'memberUpdate', 'Timeout removed', `${newMember.user.tag} is no longer timed out.`);
      }
    }

    const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id) && role.id !== newMember.guild.id);
    const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id) && role.id !== newMember.guild.id);
    if (addedRoles.size) {
      await sendLog(newMember.guild, 'memberUpdate', 'Roles added', `${newMember.user.tag}
${[...addedRoles.values()].map((role) => role.toString()).join(', ')}`);
    }
    if (removedRoles.size) {
      await sendLog(newMember.guild, 'memberUpdate', 'Roles removed', `${newMember.user.tag}
${[...removedRoles.values()].map((role) => role.toString()).join(', ')}`);
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
  const variables = {
    user: `<@${member.id}>`,
    userTag: member.user.tag,
    server: member.guild.name,
    memberCount: member.guild.memberCount
  };
  const payload = createAnnouncementPayload(config, leave, variables, {
    modeKey: 'dmMode',
    titleKey: 'dmTitle',
    messageKey: 'dmMessage',
    footerKey: 'dmFooter',
    colorKey: 'dmColor',
    imageKey: 'dmImageUrl',
    fallbackTitle: '👋 You left {server}'
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
      const payload = createAnnouncementPayload(config, config.leave, {
        user: `<@${member.id}>`,
        userTag: member.user.tag,
        server: member.guild.name,
        memberCount: member.guild.memberCount,
        boostCount: member.guild.premiumSubscriptionCount || 0,
        boostTier: member.guild.premiumTier || 0
      }, { fallbackTitle: '👋 Member left' });
      await channel.send(payload).catch(() => null);
    }
  }
  await sendLog(member.guild, 'memberLeave', '🚪 Member leave', `${member.user.tag} left the server.`, {
    userId: member.user.id,
    authorName: member.user.tag,
    fields: [{ name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }]
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
  await sendLog(invite.guild, 'inviteCreate', 'Invite created', `Code: **${invite.code}**
Channel: ${invite.channel ? `<#${invite.channel.id}>` : 'unknown'}
Max uses: **${invite.maxUses || '∞'}**`);
});

client.on(Events.InviteDelete, async (invite) => {
  const cache = client.inviteCache.get(invite.guild.id) || new Map();
  cache.delete(invite.code);
  client.inviteCache.set(invite.guild.id, cache);
  await sendLog(invite.guild, 'inviteDelete', 'Invite deleted', `Code: **${invite.code}**`);
});

client.on(Events.ChannelCreate, async (channel) => {
  const guild = channel.guild;
  if (!guild) return;
  await sendLog(guild, 'channelCreate', 'Channel created', `${channel} • **${channelTypeName(channel.type)}**`);
});

client.on(Events.ChannelDelete, async (channel) => {
  const guild = channel.guild;
  if (!guild) return;
  await sendLog(guild, 'channelDelete', 'Channel deleted', `#${channel.name || 'unknown'} • **${channelTypeName(channel.type)}**`);
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  const guild = newChannel.guild || oldChannel.guild;
  if (!guild) return;
  const changes = [];
  if (oldChannel.name !== newChannel.name) changes.push(`Name: **${oldChannel.name}** → **${newChannel.name}**`);
  if (oldChannel.parentId !== newChannel.parentId) changes.push(`Category changed.`);
  if (typeof oldChannel.topic !== 'undefined' && oldChannel.topic !== newChannel.topic) changes.push('Topic updated.');
  if (!changes.length) return;
  await sendLog(guild, 'channelUpdate', 'Channel updated', `${newChannel}
${changes.join('\n')}`);
});

client.on(Events.RoleCreate, async (role) => {
  await sendLog(role.guild, 'roleCreate', 'Role created', `${role} • Color: **${role.hexColor}**`);
});

client.on(Events.RoleDelete, async (role) => {
  await sendLog(role.guild, 'roleDelete', 'Role deleted', `**${role.name}**`);
});

client.on(Events.RoleUpdate, async (oldRole, newRole) => {
  const changes = [];
  if (oldRole.name !== newRole.name) changes.push(`Name: **${oldRole.name}** → **${newRole.name}**`);
  if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: **${oldRole.hexColor}** → **${newRole.hexColor}**`);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('Permissions updated.');
  if (!changes.length) return;
  await sendLog(newRole.guild, 'roleUpdate', 'Role updated', `${newRole}
${changes.join('\n')}`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  if (!guild || newState.member?.user?.bot) return;
  if (!oldState.channelId && newState.channelId) {
    await sendLog(guild, 'voiceJoin', 'Voice join', `${newState.member.user.tag} joined <#${newState.channelId}>.`);
  } else if (oldState.channelId && !newState.channelId) {
    await sendLog(guild, 'voiceLeave', 'Voice leave', `${newState.member.user.tag} left <#${oldState.channelId}>.`);
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    await sendLog(guild, 'voiceMove', 'Voice move', `${newState.member.user.tag} moved from <#${oldState.channelId}> to <#${newState.channelId}>.`);
  }

  const config = getGuildConfig(guild.id);
  const tempChannels = config.voice?.temp?.channels || {};
  const hubChannelId = config.voice?.temp?.hubChannelId || null;

  if (newState.channelId) {
    const blocked = await enforceVoiceRestrictions(newState.member, newState.channelId);
    if (blocked) {
      await sendLog(guild, 'moderation', 'Voice join blocked', `${newState.member.user.tag} tried to join <#${newState.channelId}> while holding the configured voice ban role.`);
      await refreshGuildStats(guild);
      queueProgressBoardRefresh(guild.id);
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
      await oldChannel.delete('DvL temp voice cleanup').catch(() => null);
      client.store.updateGuild(guild.id, (g) => {
        if (g.voice?.temp?.channels) delete g.voice.temp.channels[oldChannelId];
        return g;
      });
    }
  }

  await refreshGuildStats(guild);
  queueProgressBoardRefresh(guild.id);
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
    ]
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
  try {
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

      if (interaction.customId.startsWith('cfgpanel:')) {
        return handleConfigPanelInteraction(interaction);
      }

      if (interaction.customId.startsWith('dashboard:')) {
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
        const page = interaction.customId.split(':')[1] || 'home';
        const guildConfig = getGuildConfig(interaction.guild.id);
        return interaction.update({ embeds: [createDashboardEmbed(guildConfig, interaction.guild, page)], components: createDashboardComponents(page) });
      }

      if (interaction.customId.startsWith('dashboardquick:')) {
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
        const [, action, pageRaw] = interaction.customId.split(':');
        const page = pageRaw || 'home';
        const guildConfig = getGuildConfig(interaction.guild.id);
        if (action === 'refresh') {
          return interaction.update({ embeds: [createDashboardEmbed(guildConfig, interaction.guild, page)], components: createDashboardComponents(page) });
        }
        if (action === 'help') {
          const info = getHelpTargetInfo(client, 'Categories');
          return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, 'Categories', 1)], components: createHelpComponents(info.category || 'Categories', 1, info.totalPages || 1) });
        }
        if (action === 'logs') {
          return interaction.update({ embeds: [createLogsPanelEmbed(guildConfig, 1)], components: createLogsPanelComponents(guildConfig, 1) });
        }
        if (action === 'progress') {
          return interaction.update({ embeds: [createServerProgressEmbed(guildConfig, interaction.guild)], components: createServerProgressComponents() });
        }
      }
      
      if (interaction.customId === 'trophy:refresh') {
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
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
        return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, category || 'Home', page)], components: createHelpComponents(info.category || 'Home', page, info.totalPages || 1) });
      }
      if (interaction.customId.startsWith('help:')) {
        const [, categoryRaw, pageRaw] = interaction.customId.split(':');
        const category = categoryRaw || 'Home';
        const page = Math.max(1, Number(pageRaw) || 1);
        const guildConfig = interaction.guild ? getGuildConfig(interaction.guild.id) : { embedColor: '#5865F2', prefix: DEFAULT_PREFIX };
        const info = getHelpTargetInfo(client, category);
        return interaction.update({ embeds: [createHelpEmbed(client, guildConfig, category, page)], components: createHelpComponents(info.category || category, page, info.totalPages || 1) });
      }

      if (interaction.customId.startsWith('logpanel:')) {
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
        const config = getGuildConfig(interaction.guild.id);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ embeds: [baseEmbed(config, 'Logs panel', 'You need Manage Server to use this panel.')], ephemeral: true });
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
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true }).catch(() => null);
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
        if (!draft) return interaction.reply({ content: 'Draft not found.', ephemeral: true });
        if (draft.ownerId !== interaction.user.id) return interaction.reply({ content: 'This builder is not yours.', ephemeral: true });

        if (field === 'send') {
          const channel = await client.channels.fetch(draft.channelId).catch(() => null);
          if (!channel?.isTextBased?.()) return interaction.reply({ content: 'Channel not found.', ephemeral: true });
          const embed = new EmbedBuilder().setColor(ensureHexColor(draft.embed.color || '#5865F2')).setTimestamp().setFooter({ text: 'DvL' });
          if (draft.embed.title) embed.setTitle(draft.embed.title);
          if (draft.embed.description) embed.setDescription(draft.embed.description);
          if (draft.embed.author) embed.setAuthor({ name: draft.embed.author });
          if (draft.embed.footer) embed.setFooter({ text: draft.embed.footer });
          if (draft.embed.image) embed.setImage(draft.embed.image);
          if (draft.embed.thumbnail) embed.setThumbnail(draft.embed.thumbnail);
          await channel.send({ embeds: [embed] }).catch(() => null);
          client.embedDrafts.delete(draftId);
          return interaction.update({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), 'Embed sent', 'Your embed was published.')], components: [] });
        }

        if (field === 'cancel') {
          client.embedDrafts.delete(draftId);
          return interaction.update({ embeds: [baseEmbed(getGuildConfig(interaction.guild.id), 'Embed cancelled', 'Builder closed.')], components: [] });
        }

        const labels = {
          title: 'Title',
          description: 'Description',
          author: 'Author',
          footer: 'Footer',
          color: 'Hex color',
          image: 'Image URL',
          thumbnail: 'Thumbnail URL'
        };
        const modal = new ModalBuilder().setCustomId(`embedmodal:${field}:${draftId}`).setTitle(`Edit ${labels[field] || field}`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('value')
              .setLabel(labels[field] || field)
              .setStyle(field === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short)
              .setRequired(false)
              .setValue(String(draft.embed[field] || '').slice(0, 4000))
          )
        );
        return interaction.showModal(modal);
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

      if (interaction.customId.startsWith('cfgpanelmodal:')) {
        const [, moduleKeyRaw, field] = interaction.customId.split(':');
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true });
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server is required.', ephemeral: true });
        const moduleKey = ['welcome', 'leave', 'leave-dm', 'boost'].includes(moduleKeyRaw) ? moduleKeyRaw : 'welcome';
        const metaMap = {
          welcome: { root: 'welcome', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' },
          leave: { root: 'leave', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' },
          'leave-dm': { root: 'leave', titleKey: 'dmTitle', messageKey: 'dmMessage', footerKey: 'dmFooter', colorKey: 'dmColor', imageKey: 'dmImageUrl' },
          boost: { root: 'boost', titleKey: 'title', messageKey: 'message', footerKey: 'footer', colorKey: 'color', imageKey: 'imageUrl' }
        };
        const meta = metaMap[moduleKey] || metaMap.welcome;
        const keyMap = { title: meta.titleKey, message: meta.messageKey, footer: meta.footerKey, color: meta.colorKey, image: meta.imageKey };
        const targetKey = keyMap[field] || meta.messageKey;
        let value = interaction.fields.getTextInputValue('value').trim();
        if (field === 'color') value = value ? ensureHexColor(value) : null;
        client.store.updateGuild(interaction.guild.id, (guild) => {
          guild[meta.root] = guild[meta.root] || JSON.parse(JSON.stringify(DEFAULT_GUILD[meta.root] || {}));
          guild[meta.root][targetKey] = value || null;
          return guild;
        });
        const fresh = getGuildConfig(interaction.guild.id);
        const currentChannel = interaction.channel;
        if (interaction.message?.editable) {
          await interaction.message.edit({ embeds: [createConfigPanelEmbed(fresh, interaction.guild, moduleKey, currentChannel)], components: createConfigPanelComponents(moduleKey, currentChannel?.id) }).catch(() => null);
        }
        return interaction.reply({ embeds: [baseEmbed(fresh, '📝 Smart panel', `${field} updated for ${moduleKey}.`)], ephemeral: true });
      }

      if (interaction.customId.startsWith('supportpanelmodal:')) {
        const [, field] = interaction.customId.split(':');
        if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true });
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server is required.', ephemeral: true });

        const keyMap = { title: 'promptTitle', message: 'promptMessage', footer: 'promptFooter', color: 'promptColor', image: 'promptImageUrl' };
        const targetKey = keyMap[field] || 'promptMessage';
        let value = interaction.fields.getTextInputValue('value').trim();
        if (field === 'color') value = value ? ensureHexColor(value) : null;
        client.store.updateGuild(interaction.guild.id, (guild) => updateSupportPrompt(guild, (support) => {
          support[targetKey] = value || null;
        }));
        const fresh = getGuildConfig(interaction.guild.id);
        const currentChannel = interaction.channel;
        if (interaction.message?.editable) {
          await interaction.message.edit({ embeds: [createSupportPanelEmbed(fresh, interaction.guild, client.meta.defaultPrefix || '+', currentChannel)], components: createSupportPanelComponents() }).catch(() => null);
        }
        return interaction.reply({ embeds: [baseEmbed(fresh, '📨 Support prompt', `${field} updated.`)], ephemeral: true });
      }
      if (interaction.customId.startsWith('embedmodal:')) {
        const [, field, draftId] = interaction.customId.split(':');
        const draft = client.embedDrafts.get(draftId);
        if (!draft) return interaction.reply({ content: 'Draft not found.', ephemeral: true });
        if (draft.ownerId !== interaction.user.id) return interaction.reply({ content: 'This builder is not yours.', ephemeral: true });

        let value = interaction.fields.getTextInputValue('value').trim();
        if (field === 'color') value = ensureHexColor(value || draft.embed.color || '#5865F2');
        draft.embed[field] = value || null;

        const channel = await client.channels.fetch(draft.channelId).catch(() => null);
        const message = channel?.isTextBased?.() && draft.messageId ? await channel.messages.fetch(draft.messageId).catch(() => null) : null;

        const preview = new EmbedBuilder().setColor(ensureHexColor(draft.embed.color || '#5865F2')).setTimestamp().setFooter({ text: 'DvL embed builder' });
        if (draft.embed.title) preview.setTitle(draft.embed.title);
        if (draft.embed.description) preview.setDescription(draft.embed.description);
        if (draft.embed.author) preview.setAuthor({ name: draft.embed.author });
        if (draft.embed.footer) preview.setFooter({ text: draft.embed.footer });
        if (draft.embed.image) preview.setImage(draft.embed.image);
        if (draft.embed.thumbnail) preview.setThumbnail(draft.embed.thumbnail);

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

        if (message) await message.edit({ embeds: [preview], components: [row1, row2] }).catch(() => null);
        return interaction.reply({ content: `${field} updated.`, ephemeral: true });
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
