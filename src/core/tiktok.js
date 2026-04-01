const axios = require('axios');
const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const { ensureHexColor } = require('./utils');

const parser = new Parser();
const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  referer: 'https://www.tiktok.com/'
};

async function httpGet(url, extra = {}) {
  return axios.get(url, {
    headers: { ...DEFAULT_HEADERS, ...(extra.headers || {}) },
    timeout: 15000,
    validateStatus: () => true,
    maxRedirects: typeof extra.maxRedirects === 'number' ? extra.maxRedirects : 5,
    ...extra
  });
}

async function fetchViaRSS(username) {
  const base = process.env.TIKTOK_RSS_BASE_URL;
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/tiktok/user/${encodeURIComponent(username)}`;
  const feed = await parser.parseURL(url);
  const latest = feed.items?.[0];
  if (!latest) return { latestVideoId: null, latestVideoUrl: null, isLive: false, source: 'rss' };
  const match = latest.link?.match(/\/video\/(\d+)/);
  return {
    latestVideoId: match?.[1] || latest.guid || latest.link,
    latestVideoUrl: latest.link || null,
    latestTitle: latest.title || null,
    isLive: false,
    liveRoomId: null,
    source: 'rss'
  };
}

function extractJsonFromHtml(html) {
  const patterns = [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i,
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      return JSON.parse(match[1]);
    } catch {}
  }
  return null;
}

function walkForLatestVideo(obj, username, result = { latestVideoId: null, latestVideoUrl: null, latestCreateTime: 0, coverUrl: null, latestTitle: null }) {
  if (!obj || typeof obj !== 'object') return result;
  if (Array.isArray(obj)) {
    for (const item of obj) walkForLatestVideo(item, username, result);
    return result;
  }

  const itemId = obj.id || obj.itemId || obj.aweme_id || obj.awemeId;
  const createTime = Number(obj.createTime || obj.create_time || obj.createTimestamp || 0);
  if (itemId && createTime >= result.latestCreateTime) {
    result.latestCreateTime = createTime;
    result.latestVideoId = String(itemId);
    result.latestVideoUrl = `https://www.tiktok.com/@${username}/video/${itemId}`;
    result.coverUrl = obj.video?.cover || obj.video?.originCover || obj.cover || obj.dynamicCover || result.coverUrl || null;
    result.latestTitle = obj.desc || obj.description || obj.title || result.latestTitle || null;
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') walkForLatestVideo(value, username, result);
  }
  return result;
}

function walkForLiveInfo(obj, result = { isLive: false, liveRoomId: null }) {
  if (!obj || typeof obj !== 'object') return result;
  if (Array.isArray(obj)) {
    for (const item of obj) walkForLiveInfo(item, result);
    return result;
  }

  const roomId = obj.liveRoomId || obj.roomId || obj.room_id || obj.live_room_id || null;
  if (roomId) {
    result.isLive = true;
    result.liveRoomId = String(roomId);
  }
  if (obj.isLive === true || obj.is_live === true || obj.liveStatus === 1) result.isLive = true;

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') walkForLiveInfo(value, result);
  }
  return result;
}

function extractVideoIdFromHtml(html, username) {
  const matches = [...String(html || '').matchAll(/\/@[^/]+\/video\/(\d{8,})/g)].map((match) => match[1]);
  const latestVideoId = matches[0] || null;
  return latestVideoId ? {
    latestVideoId,
    latestVideoUrl: `https://www.tiktok.com/@${username}/video/${latestVideoId}`
  } : { latestVideoId: null, latestVideoUrl: null };
}


function walkForProfile(obj, result = { avatarUrl: null, displayName: null, bio: null, verified: null, followerCount: null, followingCount: null, heartCount: null, videoCount: null }) {
  if (!obj || typeof obj !== 'object') return result;
  if (Array.isArray(obj)) {
    for (const item of obj) walkForProfile(item, result);
    return result;
  }

  const avatar = obj.avatarLarger || obj.avatarMedium || obj.avatarThumb || obj.avatar_url || obj.avatarUrl || obj.avatar;
  const displayName = obj.nickname || obj.uniqueId || obj.display_name || obj.displayName;
  const bio = obj.signature || obj.bio || obj.desc || null;

  if (avatar && !result.avatarUrl) result.avatarUrl = String(avatar);
  if (displayName && !result.displayName) result.displayName = String(displayName);
  if (bio && !result.bio) result.bio = String(bio);
  if (typeof obj.verified === 'boolean' && result.verified === null) result.verified = obj.verified;
  if (result.followerCount == null && Number.isFinite(Number(obj.followerCount))) result.followerCount = Number(obj.followerCount);
  if (result.followingCount == null && Number.isFinite(Number(obj.followingCount))) result.followingCount = Number(obj.followingCount);
  if (result.heartCount == null && Number.isFinite(Number(obj.heartCount))) result.heartCount = Number(obj.heartCount);
  if (result.videoCount == null && Number.isFinite(Number(obj.videoCount))) result.videoCount = Number(obj.videoCount);

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') walkForProfile(value, result);
  }
  return result;
}

function extractAvatarFromHtml(html) {
  const patterns = [
    /\"avatar(Larger|Medium|Thumb)?\"\s*:\s*\"([^\"]+)\"/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  ];
  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[2] || match?.[1]) return (match[2] || match[1]).replace(/\u002F/g, '/');
  }
  return null;
}

function formatCompactNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
}

function extractLiveInfoFromHtml(html) {
  const roomMatch = String(html || '').match(/"(?:liveRoomId|roomId|room_id)"\s*:\s*"?(\d{5,})"?/i);
  const isLiveByFlag = /"isLive"\s*:\s*true/i.test(String(html || ''));
  return {
    isLive: Boolean(roomMatch || isLiveByFlag),
    liveRoomId: roomMatch?.[1] || null
  };
}

async function fetchViaLivePage(username) {
  const liveUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}/live`;
  const response = await httpGet(liveUrl);
  if (response.status >= 400) throw new Error(`TikTok live HTTP ${response.status}`);
  const html = String(response.data || '');
  const finalUrl = response.request?.res?.responseUrl || liveUrl;
  const liveInfo = extractLiveInfoFromHtml(html);
  return {
    isLive: Boolean(liveInfo.isLive),
    liveRoomId: liveInfo.liveRoomId || null,
    finalUrl,
    source: 'live-page'
  };
}

async function fetchViaPublicPage(username) {
  const url = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const response = await httpGet(url);
  if (response.status >= 400) throw new Error(`TikTok HTTP ${response.status}`);

  const html = String(response.data || '');
  const json = extractJsonFromHtml(html);
  const latest = json ? walkForLatestVideo(json, username) : extractVideoIdFromHtml(html, username);
  const profile = json ? walkForProfile(json) : { avatarUrl: extractAvatarFromHtml(html), displayName: null, bio: null, verified: null, followerCount: null, followingCount: null, heartCount: null, videoCount: null };
  const liveFromJson = json ? walkForLiveInfo(json) : { isLive: false, liveRoomId: null };
  const liveFromHtml = extractLiveInfoFromHtml(html);

  let liveProbe = { isLive: false, liveRoomId: null, source: 'public-page' };
  try {
    liveProbe = await fetchViaLivePage(username);
  } catch {}

  return {
    latestVideoId: latest.latestVideoId,
    latestVideoUrl: latest.latestVideoUrl,
    latestTitle: latest.latestTitle || null,
    coverUrl: latest.coverUrl || null,
    avatarUrl: profile.avatarUrl || null,
    displayName: profile.displayName || username,
    bio: profile.bio || null,
    verified: typeof profile.verified === 'boolean' ? profile.verified : null,
    followerCount: profile.followerCount ?? null,
    followingCount: profile.followingCount ?? null,
    heartCount: profile.heartCount ?? null,
    videoCount: profile.videoCount ?? null,
    isLive: Boolean(liveFromJson.isLive || liveFromHtml.isLive || liveProbe.isLive),
    liveRoomId: liveFromJson.liveRoomId || liveFromHtml.liveRoomId || liveProbe.liveRoomId || null,
    finalUrl: liveProbe.finalUrl || response.request?.res?.responseUrl || url,
    source: liveProbe.isLive ? liveProbe.source : 'public-page'
  };
}

async function fetchTikTokStatus(username) {
  const attempts = [];
  if (process.env.TIKTOK_RSS_BASE_URL) attempts.push(fetchViaRSS);
  attempts.push(fetchViaPublicPage);

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt(username);
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to reach TikTok.');
}

function tiktokEmbed(guildConfig, username, status, kind = 'video', mentionRoleId = null) {
  const profileUrl = kind === 'live'
    ? `https://www.tiktok.com/@${username}/live`
    : (status.latestVideoUrl || `https://www.tiktok.com/@${username}`);
  const displayName = status.displayName || username;
  const verifiedLabel = status.verified === true ? ' • verified' : '';

  const embed = new EmbedBuilder()
    .setColor(ensureHexColor(guildConfig?.embedColor))
    .setAuthor({
      name: `TikTok • ${displayName} (@${username})${verifiedLabel}`,
      iconURL: status.avatarUrl || undefined,
      url: `https://www.tiktok.com/@${username}`
    })
    .setURL(profileUrl)
    .setThumbnail(status.avatarUrl || null)
    .setFooter({ text: kind === 'live' ? 'TikTok Live Alert' : 'TikTok Post Alert' })
    .setTimestamp();

  if (kind === 'live') {
    embed
      .setTitle('🔴 TikTok Live Started')
      .setDescription([
        `**${displayName}** is now live on TikTok.`,
        status.bio ? `> ${String(status.bio).slice(0, 180)}` : null
      ].filter(Boolean).join('\n'))
      .addFields(
        { name: 'Account', value: `[@${username}](https://www.tiktok.com/@${username})`, inline: true },
        { name: 'Room ID', value: status.liveRoomId || 'n/a', inline: true },
        { name: 'Source', value: status.source || 'n/a', inline: true }
      );
  } else {
    embed
      .setTitle('🎬 New TikTok Video')
      .setDescription([
        `A new TikTok video was detected for **${displayName}**.`,
        status.latestTitle ? `> ${String(status.latestTitle).slice(0, 180)}` : null
      ].filter(Boolean).join('\n'))
      .addFields(
        { name: 'Account', value: `[@${username}](https://www.tiktok.com/@${username})`, inline: true },
        { name: 'Video ID', value: status.latestVideoId || 'n/a', inline: true },
        { name: 'Source', value: status.source || 'n/a', inline: true }
      );
    if (status.coverUrl) embed.setImage(status.coverUrl);
  }

  const stats = [];
  if (status.followerCount != null) stats.push(`Followers: **${formatCompactNumber(status.followerCount)}**`);
  if (status.heartCount != null) stats.push(`Likes: **${formatCompactNumber(status.heartCount)}**`);
  if (status.videoCount != null) stats.push(`Videos: **${formatCompactNumber(status.videoCount)}**`);
  if (stats.length) embed.addFields({ name: 'Profile stats', value: stats.join(' • '), inline: false });

  const content = mentionRoleId ? `<@&${mentionRoleId}>` : null;
  return { content, embeds: [embed] };
}

async function checkTikTokWatchers(client) {
  for (const [guildId, guildConfig] of Object.entries(client.store.db.guilds || {})) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const watchers = guildConfig?.tiktok?.watchers || [];
    if (!watchers.length) continue;

    for (const watcher of watchers) {
      try {
        const status = await fetchTikTokStatus(watcher.username);
        const channel = await client.channels.fetch(watcher.channelId).catch(() => null);
        if (!channel?.isTextBased?.()) continue;

        if (watcher.announceVideos && status.latestVideoId && watcher.lastVideoId && watcher.lastVideoId !== status.latestVideoId) {
          await channel.send(tiktokEmbed(guildConfig, watcher.username, status, 'video', watcher.mentionRoleId)).catch(() => null);
        }

        const liveChanged = watcher.announceLive && status.isLive && (!watcher.wasLive || (status.liveRoomId && watcher.lastLiveRoomId !== status.liveRoomId));
        if (liveChanged) {
          await channel.send(tiktokEmbed(guildConfig, watcher.username, status, 'live', watcher.mentionRoleId)).catch(() => null);
        }

        watcher.lastVideoId = status.latestVideoId || watcher.lastVideoId || null;
        watcher.wasLive = Boolean(status.isLive);
        watcher.lastLiveRoomId = status.liveRoomId || watcher.lastLiveRoomId || null;
        watcher.lastCheckAt = Date.now();
        watcher.lastSource = status.source || null;
        watcher.lastError = null;
      } catch (error) {
        watcher.lastError = String(error.message || error);
        watcher.lastCheckAt = Date.now();
      }
    }

    client.store.scheduleSave();
  }
}

module.exports = { fetchTikTokStatus, tiktokEmbed, checkTikTokWatchers };
