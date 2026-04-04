
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

function isFrenchGuild(guildConfig) {
  return String(guildConfig?.language || '').toLowerCase() === 'fr';
}

const FR_REPLACEMENTS = [
  [/An error occurred while running/gi, 'Une erreur est survenue pendant l’exécution de'],
  [/You need Manage Server to use this panel\./gi, 'Tu dois avoir la permission Gérer le serveur pour utiliser ce panel.'],
  [/Open this panel inside a text channel first\./gi, 'Ouvre d’abord ce panel dans un salon textuel.'],
  [/Open this panel inside the public support channel, or set a member channel first\./gi, 'Ouvre ce panel dans le salon support public, ou définis d’abord un salon membre.'],
  [/Set a valid support member channel first\./gi, 'Définis d’abord un salon support membre valide.'],
  [/No invite URL available\. Set `BOT_INVITE_URL` or `DISCORD_CLIENT_ID`\./gi, 'Aucune URL d’invitation disponible. Défini `BOT_INVITE_URL` ou `DISCORD_CLIENT_ID`.'],
  [/This builder is not yours\./gi, 'Ce builder ne t’appartient pas.'],
  [/Draft not found\./gi, 'Brouillon introuvable.'],
  [/Message not found\./gi, 'Message introuvable.'],
  [/That message has no embed to copy\./gi, 'Ce message n’a aucun embed à copier.'],
  [/Click \*\*Send\*\* to post it again\./gi, 'Clique sur **Envoyer** pour le republier.'],
  [/Guild only\./gi, 'Serveur uniquement.'],
  [/Command not found\./gi, 'Commande introuvable.'],
  [/Manage Server is required\./gi, 'La permission Gérer le serveur est requise.'],
  [/Invalid support panel action\./gi, 'Action du panel support invalide.'],
  [/Unknown action\./gi, 'Action inconnue.'],
  [/No content\./gi, 'Aucun contenu.'],
  [/No details\./gi, 'Aucun détail.'],
  [/Server language set to \*\*(fr|en)\*\*\./gi, 'Langue du serveur définie sur **$1**.'],
  [/Current:/g, 'Actuel :'],
  [/Allowed values:/g, 'Valeurs autorisées :'],
  [/Allowed:/g, 'Autorisé :'],
  [/Quick use:/g, 'Usage rapide :'],
  [/Usage:/g, 'Utilisation :'],
  [/What it does:/g, 'Description :'],
  [/Aliases:/g, 'Alias :'],
  [/Relay on\/off/g, 'Relais on/off'],
  [/Relay here/g, 'Relais ici'],
  [/Support here/g, 'Support ici'],
  [/Embed\/plain/g, 'Embed/texte'],
  [/Send prompt/g, 'Envoyer le prompt'],
  [/Clear entry/g, 'Retirer entrée'],
  [/Clear relay/g, 'Retirer relais'],
  [/Reset text/g, 'Réinitialiser le texte'],
  [/Logs panel/g, 'Panel logs'],
  [/Full logs panel/g, 'Panel logs complet'],
  [/Default here/g, 'Par défaut ici'],
  [/Ghost here/g, 'Ghost ici'],
  [/Ghost test/g, 'Test ghost'],
  [/Security hub/g, 'Hub sécurité'],
  [/Bind members/g, 'Lier membres'],
  [/Bind online/g, 'Lier en ligne'],
  [/Bind voice/g, 'Lier vocal'],
  [/Logs here/g, 'Logs ici'],
  [/Auto-react on\/off/g, 'Auto-react on/off'],
  [/Sticky set/g, 'Définir sticky'],
  [/Sticky off/g, 'Retirer sticky'],
  [/Create \/ Join/g, 'Créer / rejoindre'],
  [/Claim Crown/g, 'Récupérer la couronne'],
  [/Leave DM/g, 'Leave DM'],
  [/Language updated/g, 'Langue mise à jour'],
  [/Support panel/g, 'Panel support'],
  [/Smart panel/g, 'Panel config'],
  [/Text panel/g, 'Panel textes'],
  [/Voice panel/g, 'Panel vocal'],
  [/Role panel/g, 'Panel rôles'],
  [/Categories/g, 'Catégories'],
  [/Refresh/g, 'Rafraîchir'],
  [/Previous/g, 'Précédent'],
  [/Prev/g, 'Préc.'],
  [/Next/g, 'Suiv.'],
  [/Home/g, 'Accueil'],
  [/Setup/g, 'Config'],
  [/Texts/g, 'Textes'],
  [/Channels/g, 'Salons'],
  [/Security/g, 'Sécurité'],
  [/Automation/g, 'Automatisation'],
  [/Voice/g, 'Vocal'],
  [/Progress/g, 'Progrès'],
  [/Help/g, 'Aide'],
  [/Start/g, 'Début'],
  [/Members/g, 'Membres'],
  [/All/g, 'Tout'],
  [/Title/g, 'Titre'],
  [/Description/g, 'Description'],
  [/Author/g, 'Auteur'],
  [/Footer/g, 'Pied de page'],
  [/Color/g, 'Couleur'],
  [/Image/g, 'Image'],
  [/Thumbnail/g, 'Miniature'],
  [/Copy/g, 'Copier'],
  [/Send/g, 'Envoyer'],
  [/Cancel/g, 'Annuler'],
  [/Delete/g, 'Supprimer'],
  [/Close/g, 'Fermer'],
  [/Rename/g, 'Renommer'],
  [/Lock/g, 'Verrouiller'],
  [/Unlock/g, 'Déverrouiller'],
  [/Hide/g, 'Cacher'],
  [/Show/g, 'Afficher'],
  [/Info/g, 'Infos'],
  [/Status/g, 'Statut'],
  [/Enabled/g, 'Activé'],
  [/Disabled/g, 'Désactivé'],
  [/Not configured/g, 'Non configuré'],
  [/Not set/g, 'Non défini'],
  [/Current/g, 'Actuel'],
  [/Welcome/g, 'Bienvenue'],
  [/Leave/g, 'Départ'],
  [/Message/g, 'Message'],
  [/Support/g, 'Support'],
  [/Boost/g, 'Boost'],
  [/Mode/g, 'Mode'],
  [/Channel/g, 'Salon'],
  [/Language/g, 'Langue'],
  [/French/g, 'Français'],
  [/English/g, 'Anglais'],
  [/Error/g, 'Erreur'],
  [/No slash version/gi, 'Pas de version slash'],
  [/Server only/gi, 'Serveur uniquement'],
  [/DM \+ server/gi, 'MP + serveur'],
  [/Server by default/gi, 'Serveur par défaut'],
  [/No special permission/gi, 'Aucune permission spéciale'],
  [/Main syntax/gi, 'Syntaxe principale'],
  [/Quick examples/gi, 'Exemples rapides'],
  [/Quick start/gi, 'Démarrage rapide'],
  [/Staff essentials/gi, 'Essentiel staff'],
  [/Member commands/gi, 'Commandes membres'],
  [/Health/gi, 'État'],
  [/Clean overview of the bot and its main hubs\./gi, 'Vue propre du bot et de ses hubs principaux.'],
  [/Use \*\*Categories\*\* when you want the neat version, or search one command directly\./gi, 'Utilise **Catégories** pour la vue propre, ou cherche directement une commande.'],
  [/Search one command directly with/gi, 'Cherche directement une commande avec'],
  [/Main setup view for the server\./gi, 'Vue principale de configuration du serveur.'],
  [/modules grouped to stay clean inside Discord limits\./gi, 'modules regroupés pour rester propres dans les limites de Discord.'],
  [/Set up the clean essentials first, then polish the rest\./gi, 'Configure d’abord l’essentiel, puis peaufine le reste.'],
  [/Fast checks/gi, 'Vérifs rapides'],
  [/Daily flow/gi, 'Routine rapide'],
  [/Useful checks/gi, 'Contrôles utiles'],
  [/Most setup mistakes are auto-corrected now\./gi, 'La plupart des erreurs de configuration sont maintenant corrigées automatiquement.'],
  [/Use .*?for a clean overview\./gi, (m)=>m],
  [/Current state/gi, 'État actuel'],
  [/Persistent control center/gi, 'Centre de contrôle permanent'],
  [/Detected issues/gi, 'Problèmes détectés'],
  [/Best pages to use first/gi, 'Pages à utiliser en premier'],
  [/Buttons in this page/gi, 'Boutons de cette page'],
  [/Useful commands/gi, 'Commandes utiles'],
  [/Smart presets/gi, 'Presets rapides'],
  [/Overview/gi, 'Vue d’ensemble'],
  [/Fast actions/gi, 'Actions rapides'],
  [/Routing/gi, 'Routage'],
  [/Prompt style/gi, 'Style du prompt'],
  [/Use this page for/gi, 'Utilise cette page pour'],
  [/Security state/gi, 'État sécurité'],
  [/Other automation/gi, 'Autre automatisation'],
  [/Stats binding/gi, 'Liaison des stats'],
  [/Current theme/gi, 'Thème actuel'],
  [/Available presets/gi, 'Presets disponibles'],
  [/No obvious issue detected\./gi, 'Aucun problème évident détecté.'],
  [/not set/gi, 'non défini'],
  [/no route/gi, 'aucune route'],
  [/no channel/gi, 'aucun salon'],
  [/no category/gi, 'aucune catégorie'],
  [/plain message/gi, 'message simple'],
  [/open in a text channel/gi, 'ouvre ce panel dans un salon textuel'],
  [/open in a text channel\./gi, 'ouvre ce panel dans un salon textuel.'],
  [/open in a voice channel/gi, 'ouvre ce panel dans un salon vocal'],
  [/Current channel/gi, 'Salon actuel'],
  [/Panel channel/gi, 'Salon du panel'],
  [/Message id/gi, 'ID du message'],
  [/Quick panel for/gi, 'Panel rapide pour'],
  [/safe mode/gi, 'mode sécurisé'],
  [/Continuation/gi, 'Suite'],
  [/Browse/gi, 'Parcourir']
];


function getVisualAuthorLabel(guildConfig) {
  return isFrenchGuild(guildConfig) ? '✦ DvL • Gestion' : '✦ DvL • Management';
}

function getVisualFooterLabel(guildConfig) {
  const prefix = guildConfig?.prefix ? ` • ${guildConfig.prefix}` : '';
  return isFrenchGuild(guildConfig) ? `DvL • Interface${prefix}` : `DvL • Control${prefix}`;
}

function applyEmbedVisualStyle(embed, guildConfig) {
  if (!embed) return embed;
  const applyRaw = (target) => {
    if (!target || typeof target !== 'object') return target;
    if (!target.color) target.color = ensureHexColor(guildConfig?.embedColor);
    if (!target.author?.name) target.author = { ...(target.author || {}), name: getVisualAuthorLabel(guildConfig) };
    if (!target.footer?.text) target.footer = { ...(target.footer || {}), text: getVisualFooterLabel(guildConfig) };
    else if (/^DvL(?:\s|•|$)/i.test(String(target.footer.text))) target.footer = { ...(target.footer || {}), text: getVisualFooterLabel(guildConfig) };
    if (!target.timestamp) target.timestamp = new Date().toISOString();
    return target;
  };

  if (embed?.data) {
    if (!embed.data.color) embed.setColor(ensureHexColor(guildConfig?.embedColor));
    if (!embed.data.author?.name) embed.setAuthor({ ...(embed.data.author || {}), name: getVisualAuthorLabel(guildConfig) });
    if (!embed.data.footer?.text || /^DvL(?:\s|•|$)/i.test(String(embed.data.footer.text))) {
      embed.setFooter({ ...(embed.data.footer || {}), text: getVisualFooterLabel(guildConfig) });
    }
    if (!embed.data.timestamp) embed.setTimestamp();
    return embed;
  }

  return applyRaw(embed);
}

function translateText(text, guildConfig) {
  if (!isFrenchGuild(guildConfig) || text == null) return text;
  let output = String(text);
  for (const [pattern, replacement] of FR_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function localizeEmbed(embed, guildConfig) {
  if (!isFrenchGuild(guildConfig) || !embed) return embed;
  const source = embed?.data ? embed : null;
  if (source) {
    if (typeof source.data?.title === 'string') source.setTitle(translateText(source.data.title, guildConfig).slice(0, 256));
    if (typeof source.data?.description === 'string') source.setDescription(translateText(source.data.description, guildConfig).slice(0, 4096));
    if (source.data?.footer?.text) source.setFooter({ ...source.data.footer, text: translateText(source.data.footer.text, guildConfig).slice(0, 2048) });
    if (source.data?.author?.name) source.setAuthor({ ...source.data.author, name: translateText(source.data.author.name, guildConfig).slice(0, 256) });
    if (Array.isArray(source.data?.fields) && source.data.fields.length) {
      source.setFields(source.data.fields.map((field) => ({
        ...field,
        name: translateText(field.name, guildConfig).slice(0, 256),
        value: translateText(field.value, guildConfig).slice(0, 1024)
      })));
    }
    return source;
  }
  if (typeof embed === 'object') {
    if (typeof embed.title === 'string') embed.title = translateText(embed.title, guildConfig).slice(0, 256);
    if (typeof embed.description === 'string') embed.description = translateText(embed.description, guildConfig).slice(0, 4096);
    if (embed.footer?.text) embed.footer = { ...embed.footer, text: translateText(embed.footer.text, guildConfig).slice(0, 2048) };
    if (embed.author?.name) embed.author = { ...embed.author, name: translateText(embed.author.name, guildConfig).slice(0, 256) };
    if (Array.isArray(embed.fields)) {
      embed.fields = embed.fields.map((field) => ({
        ...field,
        name: translateText(field.name, guildConfig).slice(0, 256),
        value: translateText(field.value, guildConfig).slice(0, 1024)
      }));
    }
  }
  return embed;
}

function localizeComponent(component, guildConfig) {
  if (!isFrenchGuild(guildConfig) || !component) return component;
  if (Array.isArray(component.components)) {
    component.components.forEach((child) => localizeComponent(child, guildConfig));
  }
  const label = component.data?.label;
  if (label && typeof component.setLabel === 'function') component.setLabel(translateText(label, guildConfig).slice(0, 80));
  const placeholder = component.data?.placeholder;
  if (placeholder && typeof component.setPlaceholder === 'function') component.setPlaceholder(translateText(placeholder, guildConfig).slice(0, 150));
  const options = component.data?.options;
  if (Array.isArray(options) && typeof component.setOptions === 'function') {
    component.setOptions(options.map((option) => ({
      ...option,
      label: translateText(option.label, guildConfig).slice(0, 100),
      description: option.description ? translateText(option.description, guildConfig).slice(0, 100) : option.description
    })));
  }
  return component;
}

function localizePayload(guildConfig, payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  if (typeof next.content === 'string' && isFrenchGuild(guildConfig)) next.content = translateText(next.content, guildConfig);
  if (Array.isArray(next.embeds)) next.embeds = next.embeds.map((embed) => applyEmbedVisualStyle(isFrenchGuild(guildConfig) ? localizeEmbed(embed, guildConfig) : embed, guildConfig));
  if (Array.isArray(next.components) && isFrenchGuild(guildConfig)) next.components = next.components.map((component) => localizeComponent(component, guildConfig));
  return next;
}

function baseEmbed(guildConfig, title, description) {
  const resolvedDescription = Array.isArray(description)
    ? description.filter(Boolean).join('\n')
    : String(description || '').trim();
  return applyEmbedVisualStyle(new EmbedBuilder()
    .setColor(ensureHexColor(guildConfig?.embedColor))
    .setTitle(translateText(String(title || 'DvL'), guildConfig).slice(0, 256))
    .setDescription(translateText((resolvedDescription || 'No details.'), guildConfig).slice(0, 4096)), guildConfig);
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
  translateText,
  applyEmbedVisualStyle,
  localizePayload,
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
