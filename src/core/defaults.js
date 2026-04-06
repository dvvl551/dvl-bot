
const DEFAULT_GUILD = {
  prefix: '+',
  embedColor: '#5865F2',
  language: 'fr',
  welcome: {
    enabled: false,
    channelId: null,
    title: '👋 Bienvenue',
    message: 'Bienvenue {user} sur **{server}**. Tu es le membre **#{memberCount}**.',
    mode: 'embed',
    footer: 'DvL',
    color: null,
    imageUrl: null,
    dmEnabled: false,
    dmMode: 'embed',
    dmTitle: '👋 Bienvenue sur {server}',
    dmMessage: 'Bienvenue sur **{server}**. Profite bien de ton arrivée.',
    dmFooter: 'DvL',
    dmColor: null,
    dmImageUrl: null
  },
  leave: {
    enabled: false,
    channelId: null,
    title: '👋 Départ membre',
    message: '{userTag} a quitté **{server}**.',
    mode: 'embed',
    footer: 'DvL',
    color: null,
    imageUrl: null,
    dmEnabled: false,
    dmMode: 'embed',
    dmTitle: '👋 Tu as quitté {server}',
    dmMessage: 'Tu as quitté **{server}**. Tu peux toujours revenir plus tard.',
    dmFooter: 'DvL',
    dmColor: null,
    dmImageUrl: null
  },
  boost: {
    enabled: false,
    channelId: null,
    title: '🚀 Nouveau boost',
    message: '{user} vient de booster **{server}**. Total des boosts : **{boostCount}** • Niveau : **{boostTier}**.',
    mode: 'embed',
    footer: 'DvL',
    color: null,
    imageUrl: null
  },
  logs: {
    enabled: false,
    channelId: null,
    channels: {
      default: null,
      messages: null,
      members: null,
      moderation: null,
      voice: null,
      server: null,
      social: null
    },
    typeChannels: {},
    types: {
      moderation: true,
      messageDelete: true,
      messageEdit: true,
      ghostPing: true,
      memberJoin: true,
      memberLeave: true,
      giveaway: true,
      security: true,
      tiktok: true,
      support: true,
      invite: true,
      boost: true,
      memberUpdate: true,
      roleCreate: true,
      roleDelete: true,
      roleUpdate: true,
      channelCreate: true,
      channelDelete: true,
      channelUpdate: true,
      voiceJoin: true,
      voiceLeave: true,
      voiceMove: true,
      inviteCreate: true,
      inviteDelete: true,
      threadCreate: true,
      threadDelete: true,
      serverUpdate: true
    }
  },
  moderation: {
    warnings: {}
  },
  automod: {
    whitelistUserIds: [],
    whitelistRoleIds: [],
    ignoredChannels: [],
    picOnlyChannels: [],
    antiSpam: { enabled: false, maxMessages: 6, perSeconds: 6, punish: 'timeout', durationMs: 300000 },
    antiLink: { enabled: false, punish: 'delete' },
    antiInvite: { enabled: false, punish: 'delete' },
    antiMention: { enabled: false, maxMentions: 5, punish: 'delete' },
    antiCaps: { enabled: false, minLength: 12, percent: 80, punish: 'delete' },
    antiEmojiSpam: { enabled: false, maxEmojis: 8, punish: 'delete' },
    ghostPing: { enabled: false, channelId: null },
    raidMode: { enabled: false, joinAgeMinutes: 10080 },
    badWordsEnabled: false,
    badWords: []
  },
  roles: {
    autoRoles: [],
    autoRolesHumans: [],
    autoRolesBots: [],
    rolePanels: {},
    reactionRoles: {},
    statusRole: {
      enabled: false,
      roleId: null,
      matchText: '',
      matchTexts: [],
      mode: 'includes',
      removeWhenMissing: true
    }
  },
  permissions: {
    levels: {
      '1': { roleId: null, commands: [] },
      '2': { roleId: null, commands: [] },
      '3': { roleId: null, commands: [] },
      '4': { roleId: null, commands: [] },
      '5': { roleId: null, commands: [] }
    }
  },
  support: {
    enabled: false,
    channelId: null,
    pingRoleId: null,
    entryChannelId: null,
    restrictToEntry: false,
    entryCommandOnly: false,
    promptMode: 'embed',
    promptTitle: '📨 Besoin d’aide ?',
    promptMessage: 'Pour contacter le staff, va dans {supportChannel} et utilise `{prefix}support ton message`.',
    promptFooter: 'DvL Support',
    promptColor: null,
    promptImageUrl: null
  },
  confessions: {
    enabled: false,
    channelId: null,
    logChannelId: null,
    title: '🤫 Confession anonyme',
    color: '#EC4899',
    allowAttachments: true
  },
  mpall: {
    mode: 'embed',
    title: '📨 Message de {server}',
    message: '',
    footer: 'DvL',
    color: null,
    imageUrl: null
  },
  panel: {
    theme: 'default',
    deployedChannelId: null,
    deployedMessageId: null,
    lastDeployedAt: null
  },

  voice: {
    temp: {
      panels: {},
      channels: {},
      defaultLimit: 0,
      defaultBitrate: null,
      hubChannelId: null,
      hubCategoryId: null,
      panelChannelId: null,
      panelMessageId: null
    },
    moderation: {
      muteRoleId: null,
      banRoleId: null
    }
  },
  stats: {
    enabled: false,
    categoryId: null,
    channels: {
      members: null,
      online: null,
      voice: null
    },
    labels: {
      members: '👥・Membres : {count}',
      online: '🌐・En ligne : {count}',
      voice: '🔊・Vocal : {count}'
    },
    lockChannels: true
  },
  progress: {
    enabled: false,
    channelId: null,
    messageId: null,
    lastUpdatedAt: null,
    title: null,
    imageMode: 'servericon',
    imageUrl: null,
    customGoals: {
      members: null,
      boosts: null,
      voice: null
    },
    memberMilestoneReward: {
      enabled: false,
      interval: 100,
      roleId: null,
      channelId: null,
      awardedCounts: []
    }
  },
  invites: {
    stats: {},
    codes: {}
  },
  giveaways: {},
  backups: [],
  reminders: [],
  tiktok: {
    watchers: []
  },
  sticky: {},
  autoReact: {
    channels: {}
  },
  afk: {}
};



const LOCALIZED_DEFAULT_TEXTS = {
  welcome: {
    title: { fr: '👋 Bienvenue', en: '👋 Welcome' },
    message: {
      fr: 'Bienvenue {user} sur **{server}**. Tu es le membre **#{memberCount}**.',
      en: 'Welcome {user} to **{server}**. You are member **#{memberCount}**.'
    },
    footer: { fr: 'DvL', en: 'DvL' },
    dmTitle: { fr: '👋 Bienvenue sur {server}', en: '👋 Welcome to {server}' },
    dmMessage: {
      fr: 'Bienvenue sur **{server}**. Profite bien de ton arrivée.',
      en: 'Welcome to **{server}**. Enjoy your arrival.'
    },
    dmFooter: { fr: 'DvL', en: 'DvL' }
  },
  leave: {
    title: { fr: '👋 Départ membre', en: '👋 Member left' },
    message: { fr: '{userTag} a quitté **{server}**.', en: '{userTag} left **{server}**.' },
    footer: { fr: 'DvL', en: 'DvL' },
    dmTitle: { fr: '👋 Tu as quitté {server}', en: '👋 You left {server}' },
    dmMessage: {
      fr: 'Tu as quitté **{server}**. Tu peux toujours revenir plus tard.',
      en: 'You left **{server}**. You can always come back with a fresh start.'
    },
    dmFooter: { fr: 'DvL', en: 'DvL' }
  },
  boost: {
    title: { fr: '🚀 Nouveau boost', en: '🚀 New boost' },
    message: {
      fr: '{user} vient de booster **{server}**. Total des boosts : **{boostCount}** • Niveau : **{boostTier}**.',
      en: '{user} just boosted **{server}**. Total boosts: **{boostCount}** • Tier: **{boostTier}**.'
    },
    footer: { fr: 'DvL', en: 'DvL' }
  },
  support: {
    promptTitle: { fr: '📨 Besoin d’aide ?', en: '📨 Need help?' },
    promptMessage: {
      fr: 'Pour contacter le staff, va dans {supportChannel} et utilise `{prefix}support ton message`.',
      en: 'To contact the staff, go to {supportChannel} and run `{prefix}support your message`.'
    },
    promptFooter: { fr: 'DvL Support', en: 'DvL Support' }
  },
  confessions: {
    title: { fr: '🤫 Confession anonyme', en: '🤫 Anonymous confession' }
  },
  mpall: {
    title: { fr: '📨 Message de {server}', en: '📨 Message from {server}' },
    footer: { fr: 'DvL', en: 'DvL' }
  }
};

function syncGuildLocalizedDefaults(guild, lang = 'fr') {
  const targetLang = String(lang || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
  const allValues = (entry) => Object.values(entry || {}).filter((value) => typeof value === 'string');
  for (const [sectionKey, fields] of Object.entries(LOCALIZED_DEFAULT_TEXTS)) {
    guild[sectionKey] = guild[sectionKey] || {};
    for (const [fieldKey, localized] of Object.entries(fields)) {
      const current = guild[sectionKey][fieldKey];
      const variants = allValues(localized);
      if (current == null || current === '' || variants.includes(current)) {
        guild[sectionKey][fieldKey] = localized[targetLang] || localized.fr || current;
      }
    }
  }
  if (!guild.language) guild.language = targetLang;
  return guild;
}

const DEFAULT_GLOBAL = {
  presence: {
    status: 'online',
    activityType: 'Watching',
    activityText: 'your server'
  },
  pdpRotator: {
    enabled: false,
    guildId: null,
    intervalMs: 30000,
    includeBots: false,
    lastUserId: null,
    lastAvatarUrl: null,
    lastAppliedAt: 0,
    lastAttemptAt: 0,
    cooldownUntil: 0,
    lastError: null
  },
  supportRoutes: {},
  supportLinks: {},
  backups: []
};

module.exports = { DEFAULT_GUILD, DEFAULT_GLOBAL, syncGuildLocalizedDefaults };
