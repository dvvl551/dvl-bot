
const DEFAULT_GUILD = {
  prefix: '+',
  embedColor: '#5865F2',
  language: 'en',
  welcome: {
    enabled: false,
    channelId: null,
    title: '👋 Welcome',
    message: 'Welcome {user} to **{server}**. You are member **#{memberCount}**.'
  },
  leave: {
    enabled: false,
    channelId: null,
    title: '👋 Member left',
    message: '{userTag} left **{server}**.',
    dmEnabled: false,
    dmTitle: '👋 You left {server}',
    dmMessage: 'You left **{server}**. You can always come back with a fresh start.'
  },
  boost: {
    enabled: false,
    channelId: null,
    title: '🚀 New boost',
    message: '{user} just boosted **{server}**. Total boosts: **{boostCount}** • Tier: **{boostTier}**.'
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
    pingRoleId: null
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

const DEFAULT_GLOBAL = {
  presence: {
    status: 'online',
    activityType: 'Watching',
    activityText: 'your server'
  },
  supportRoutes: {},
  supportLinks: {},
  backups: []
};

module.exports = { DEFAULT_GUILD, DEFAULT_GLOBAL };
