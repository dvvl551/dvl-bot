
const ms = require('ms');
const { ActivityType, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder } = require('discord.js');

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

const VISUAL_THEME_PALETTES = {
  default: { base: '#5865F2', info: '#5865F2', success: '#22C55E', warning: '#F59E0B', error: '#EF4444' },
  emerald: { base: '#10B981', info: '#10B981', success: '#22C55E', warning: '#F59E0B', error: '#EF4444' },
  sunset: { base: '#F97316', info: '#F97316', success: '#22C55E', warning: '#FBBF24', error: '#EF4444' },
  neon: { base: '#A855F7', info: '#A855F7', success: '#22C55E', warning: '#F59E0B', error: '#FB7185' }
};

function resolveVisualThemeKey(guildConfig = {}) {
  const raw = String(guildConfig?.panel?.theme || '').trim().toLowerCase();
  if (raw && VISUAL_THEME_PALETTES[raw]) return raw;
  const embedColor = ensureHexColor(guildConfig?.embedColor, '#5865F2').toLowerCase();
  const guessed = Object.entries(VISUAL_THEME_PALETTES).find(([, palette]) => String(palette.base).toLowerCase() === embedColor)?.[0];
  return guessed || 'default';
}

function getVisualPalette(guildConfig = {}) {
  const themeKey = resolveVisualThemeKey(guildConfig);
  return VISUAL_THEME_PALETTES[themeKey] || VISUAL_THEME_PALETTES.default;
}

function pickVisualColor(guildConfig = {}, kind = 'info') {
  const palette = getVisualPalette(guildConfig);
  return palette[kind] || palette.base || ensureHexColor(guildConfig?.embedColor, '#5865F2');
}

function normalizeVisualTextBlock(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function beautifyStructuredLines(text) {
  const lines = String(text || '').split('\n');
  const converted = lines.map((line) => {
    const raw = String(line || '');
    if (!raw.trim()) return '';
    const compact = raw.trim();
    const boldLabel = compact.match(/^\*\*([^*]+?)\s*:\*\*\s*(.+)$/);
    if (boldLabel) return `• **${boldLabel[1].trim()}** → ${boldLabel[2].trim()}`;
    const plainLabel = compact.match(/^\*\*([^*]+?)\*\*\s*:\s*(.+)$/);
    if (plainLabel) return `• **${plainLabel[1].trim()}** → ${plainLabel[2].trim()}`;
    const plainArrow = compact.match(/^([A-Za-zÀ-ÿ0-9#@&<>{} ._\-\/]+?)\s*:\s*(.+)$/);
    if (plainArrow && !compact.startsWith('http') && !compact.startsWith('`')) return `• **${plainArrow[1].trim()}** → ${plainArrow[2].trim()}`;
    if (/^(?:-|•|‣|▸)\s+/.test(compact)) return `• ${compact.replace(/^(?:-|•|‣|▸)\s+/, '')}`;
    if (/^\d+\.\s+/.test(compact)) return compact;
    if (/^\*\*.+\*\*$/.test(compact) && compact.length <= 80) return `### ${compact}`;
    return raw;
  });
  return normalizeVisualTextBlock(converted.join('\n'));
}

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
  [/Command denied/gi, 'Commande refusée'],
  [/Owner only/gi, 'Owner uniquement'],
  [/This command is restricted to bot owners\./gi, 'Cette commande est réservée aux owners du bot.'],
  [/You do not have the required permissions for this command\./gi, 'Tu n’as pas les permissions requises pour utiliser cette commande.'],
  [/This command only works inside a server\./gi, 'Cette commande fonctionne uniquement dans un serveur.'],
  [/This command does not work here\./gi, 'Cette commande ne fonctionne pas ici.'],
  [/Permissions$/gi, 'Permissions'],
  [/Error$/gi, 'Erreur'],
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
  [/Browse/gi, 'Parcourir'],
  [/Logs hub/gi, 'Hub logs'],
  [/Log types/gi, 'Types de logs'],
  [/Roles hub/gi, 'Hub rôles'],
  [/Support prompt/gi, 'Prompt support'],
  [/Quick view/gi, 'Vue rapide'],
  [/Recommended setup/gi, 'Setup conseillé'],
  [/Good to know/gi, 'À savoir'],
  [/Families/gi, 'Familles'],
  [/Direct per-type routes/gi, 'Routes par type'],
  [/Disabled event types/gi, 'Types coupés'],
  [/Voice Control Panel/gi, 'Panel vocal'],
  [/Create hub/gi, 'Salon créateur'],
  [/Owner tools/gi, 'Outils owner'],
  [/Create \/ Join/gi, 'Créer / rejoindre'],
  [/Claim Crown/gi, 'Récupérer la couronne'],
  [/Transfer/gi, 'Transférer'],
  [/Kick/gi, 'Expulser'],
  [/Set Default Here/gi, 'Défaut ici'],
  [/Set .* Here/gi, (m) => m],
  [/Default route/gi, 'Route par défaut'],
  [/This page route/gi, 'Route de cette page'],
  [/using default route/gi, 'route par défaut utilisée'],
  [/Enabled event types/gi, 'Types actifs'],
  [/Direct per-type routes/gi, 'Routes par type'],
  [/Main filters enabled/gi, 'Filtres actifs'],
  [/Member channel/gi, 'Salon membre'],
  [/Relay channel/gi, 'Salon relais'],
  [/Restrict to member channel/gi, 'Limiter au salon membre'],
  [/Ping role/gi, 'Rôle ping'],
  [/Current channel/gi, 'Salon actuel'],
  [/Panel channel/gi, 'Salon du panel'],
  [/Theme/gi, 'Thème'],
  [/Quick actions/gi, 'Actions rapides'],
  [/Recommended flow/gi, 'Flow conseillé'],
  [/Useful shortcuts/gi, 'Raccourcis utiles'],
  [/Configured modules/gi, 'Modules configurés'],
  [/Best pages to open first/gi, 'Pages à ouvrir d’abord'],
  [/Things to check/gi, 'Points à vérifier'],
  [/Enable logs/gi, 'Activer les logs'],
  [/Disable logs/gi, 'Désactiver les logs'],
  [/Enable/gi, 'Activer'],
  [/Disable/gi, 'Désactiver'],
  [/Reset/gi, 'Réinitialiser'],
  [/Test/gi, 'Tester'],
  [/Open/gi, 'Ouvrir'],
  [/Overview/gi, 'Vue d’ensemble'],
  [/Browse categories/gi, 'Parcourir les catégories'],
  [/Role panels/gi, 'Panneaux de rôles'],
  [/Auto roles/gi, 'Auto-rôles'],
  [/Status role/gi, 'Rôle de statut'],
  [/Temp voice/gi, 'Temp voice'],
  [/Voice moderation/gi, 'Modération vocale'],
  [/Restricted channels/gi, 'Salons restreints'],
  [/Ignored channels/gi, 'Salons ignorés'],
  [/Whitelist users/gi, 'Whitelist utilisateurs'],
  [/Whitelist roles/gi, 'Whitelist rôles'],
  [/Image-only channels/gi, 'Salons images uniquement'],
  [/Main log routing/gi, 'Routage principal des logs'],
  [/Main server hub/gi, 'Hub principal du serveur'],
  [/Server overview/gi, 'Vue d’ensemble du serveur'],
  [/Saved successfully/gi, 'Enregistré avec succès'],
  [/Updated successfully/gi, 'Mis à jour avec succès'],
  [/Created successfully/gi, 'Créé avec succès'],
  [/Deleted successfully/gi, 'Supprimé avec succès'],
  [/No result/gi, 'Aucun résultat'],
  [/No results/gi, 'Aucun résultat'],
  [/Use the buttons below/gi, 'Utilise les boutons ci-dessous'],
  [/Use the menu below/gi, 'Utilise le menu ci-dessous'],
  [/Choose an option/gi, 'Choisis une option'],
  [/Select a channel/gi, 'Choisis un salon'],
  [/Select a role/gi, 'Choisis un rôle'],
  [/Select a member/gi, 'Choisis un membre'],
  [/Choose the target/gi, 'Choisis la cible'],
  [/Good to know/gi, 'À savoir'],
  [/Next steps/gi, 'Étapes suivantes'],
  [/Current route/gi, 'Route actuelle'],
  [/Default route/gi, 'Route par défaut'],
  [/Panel style/gi, 'Style du panel'],
  [/Visual theme/gi, 'Thème visuel'],
  [/Embed builder/gi, 'Studio embed'],
  [/Copy from message/gi, 'Copier depuis un message'],
  [/No obvious issue detected\./gi, 'Aucun souci évident détecté.']
];


const SYSTEM_NOTICE_KIND_PATTERNS = {
  error: /(❌|🚫|⛔|error|failed|failure|forbidden|denied|missing|invalid|refused|permission|owner only|unable|introuvable|erreur|échec|refus|interdit|invalide|impossible)/i,
  warning: /(⚠️|warning|warn|careful|attention|avertissement)/i,
  success: /(✅|success|done|saved|sent|created|enabled|updated|ready|restored|applied|successfully|terminé|envoyé|créé|activé|mis à jour|prêt|rétabli|appliqué)/i,
  info: /(ℹ️|info|information|config|setup|panel|dashboard|hub|status|state|overview|statut|vue d.?ensemble)/i
};

const PERSISTENT_NOTICE_PATTERNS = /(help|panel|dashboard|setup|hub|overview|cat[ée]gories|categories|leaderboard|watchers|warnings|list|liste|config|preview|example|examples|vars|variables|test|bind|studio|progress|trophy|security|s[ée]curit[ée]|logs types|role panel|voice panel|support panel|smart panel|welcome|leave|boost|stats)/i;

function extractPayloadText(payload = {}) {
  return [
    typeof payload.content === 'string' ? payload.content : '',
    ...(Array.isArray(payload.embeds) ? payload.embeds.flatMap((embed) => [embed?.data?.title, embed?.data?.description, embed?.title, embed?.description].filter(Boolean)) : [])
  ].join('\n').trim();
}

function inferSystemNoticeKind(text = '') {
  const sample = String(text || '').trim();
  if (!sample) return null;
  if (SYSTEM_NOTICE_KIND_PATTERNS.error.test(sample)) return 'error';
  if (SYSTEM_NOTICE_KIND_PATTERNS.warning.test(sample)) return 'warning';
  if (SYSTEM_NOTICE_KIND_PATTERNS.success.test(sample)) return 'success';
  if (SYSTEM_NOTICE_KIND_PATTERNS.info.test(sample)) return 'info';
  return null;
}

function buildNoticeTitle(guildConfig, kind) {
  const fr = isFrenchGuild(guildConfig);
  if (kind === 'error') return fr ? '❌ Erreur' : '❌ Error';
  if (kind === 'warning') return fr ? '⚠️ Attention' : '⚠️ Warning';
  if (kind === 'success') return fr ? '✅ Succès' : '✅ Success';
  return fr ? 'ℹ️ Information' : 'ℹ️ Information';
}

function buildNoticeFooter(guildConfig, kind, deleteAfterMs = null) {
  const fr = isFrenchGuild(guildConfig);
  const label = {
    error: fr ? 'Neyora • Erreur' : 'Neyora • Error',
    warning: fr ? 'Neyora • Attention' : 'Neyora • Warning',
    success: fr ? 'Neyora • Succès' : 'Neyora • Success',
    info: fr ? 'Neyora • Info' : 'Neyora • Info'
  }[kind || 'info'];
  if (!Number.isFinite(deleteAfterMs) || deleteAfterMs <= 0) return label;
  const seconds = Math.max(1, Math.round(deleteAfterMs / 1000));
  return fr ? `${label} • suppression auto ${seconds}s` : `${label} • auto-delete ${seconds}s`;
}

function isCompactSystemNotice(payload = {}) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.components?.length || payload.files?.length || payload.stickers?.length || payload.poll) return false;
  if (Array.isArray(payload.embeds) && payload.embeds.length > 1) return false;
  const text = extractPayloadText(payload);
  if (!text || text.length > 1200) return false;
  const embed = Array.isArray(payload.embeds) ? payload.embeds[0] : null;
  const fields = embed?.data?.fields || embed?.fields || [];
  if (Array.isArray(fields) && fields.length > 3) return false;
  return true;
}

function shouldKeepNoticePersistent(payload = {}) {
  const text = extractPayloadText(payload);
  return !text || PERSISTENT_NOTICE_PATTERNS.test(text) || text.split('\n').length > 14;
}

function normalizeSystemNoticePayload(payload = {}, guildConfig, options = {}) {
  if (!payload || typeof payload !== 'object') return { payload, suggestedDeleteAfter: null, kind: null };
  const { defaultDeleteAfter = null, allowPlainContentEmbed = true } = options || {};
  const next = { ...payload };
  const rawText = extractPayloadText(next);
  let kind = inferSystemNoticeKind(rawText);

  if ((!next.embeds || !next.embeds.length) && allowPlainContentEmbed && typeof next.content === 'string' && next.content.trim() && !/[<@#:&]/.test(next.content) && next.content.length <= 320 && !next.components?.length && !next.files?.length) {
    kind = kind || 'info';
    next.embeds = [baseEmbed(guildConfig, buildNoticeTitle(guildConfig, kind), next.content)];
    delete next.content;
  }

  const compact = isCompactSystemNotice(next);
  const persistent = shouldKeepNoticePersistent(next);
  const suggestedDeleteAfter = compact && !persistent && Number.isFinite(defaultDeleteAfter) ? defaultDeleteAfter : null;

  if (Array.isArray(next.embeds) && next.embeds.length === 1 && compact) {
    let embed;
    try {
      embed = EmbedBuilder.from(next.embeds[0]);
    } catch {
      embed = new EmbedBuilder(next.embeds[0] || {});
    }
    const text = [embed.data?.title || '', embed.data?.description || ''].join('\n').trim();
    kind = kind || inferSystemNoticeKind(text) || 'info';
    if (!embed.data?.color) {
      embed.setColor(ensureHexColor(guildConfig?.embedColor));
    }
    const currentFooter = embed.data?.footer?.text ? String(embed.data.footer.text) : '';
    if (!currentFooter || /^(?:Neyora|DvL)(?:\s|•|$)/i.test(currentFooter)) {
      embed.setFooter({ ...(embed.data?.footer || {}), text: buildNoticeFooter(guildConfig, kind, suggestedDeleteAfter) });
    }
    next.embeds = [applyEmbedVisualStyle(embed, guildConfig)];
  }

  return { payload: next, suggestedDeleteAfter, kind };
}


function getVisualAuthorLabel(guildConfig) {
  const themeKey = resolveVisualThemeKey(guildConfig);
  const badge = { default: '✦', emerald: '✳️', sunset: '🌇', neon: '💠' }[themeKey] || '✦';
  return isFrenchGuild(guildConfig) ? `${badge} Neyora • Interface` : `${badge} Neyora • Control`;
}

function getVisualFooterLabel(guildConfig) {
  const prefix = guildConfig?.prefix ? ` • ${guildConfig.prefix}` : '';
  const themeKey = resolveVisualThemeKey(guildConfig);
  const themeLabel = { default: 'Default', emerald: 'Emerald', sunset: 'Sunset', neon: 'Neon' }[themeKey] || 'Default';
  return isFrenchGuild(guildConfig) ? `Neyora • Interface serveur • ${themeLabel}${prefix}` : `Neyora • Server control • ${themeLabel}${prefix}`;
}

function applyEmbedVisualStyle(embed, guildConfig) {
  if (!embed) return embed;
  const palette = getVisualPalette(guildConfig);
  const applyRaw = (target) => {
    if (!target || typeof target !== 'object') return target;
    if (!target.color) target.color = ensureHexColor(guildConfig?.embedColor, palette.base || '#5865F2');
    if (!target.author?.name) target.author = { ...(target.author || {}), name: getVisualAuthorLabel(guildConfig) };
    if (!target.footer?.text) target.footer = { ...(target.footer || {}), text: getVisualFooterLabel(guildConfig) };
    else if (/^(?:Neyora|DvL)(?:\s|•|$)/i.test(String(target.footer.text))) target.footer = { ...(target.footer || {}), text: getVisualFooterLabel(guildConfig) };
    if (typeof target.description === 'string') target.description = beautifyStructuredLines(target.description).slice(0, 4096);
    if (Array.isArray(target.fields)) target.fields = target.fields.map((field) => ({ ...field, name: String(field?.name || '•').trim().slice(0, 256), value: beautifyStructuredLines(field?.value || '—').slice(0, 1024) }));
    if (!target.timestamp) target.timestamp = new Date().toISOString();
    return target;
  };

  if (embed?.data) {
    if (!embed.data.color) embed.setColor(ensureHexColor(guildConfig?.embedColor, palette.base || '#5865F2'));
    if (!embed.data.author?.name) embed.setAuthor({ ...(embed.data.author || {}), name: getVisualAuthorLabel(guildConfig) });
    if (!embed.data.footer?.text || /^(?:Neyora|DvL)(?:\s|•|$)/i.test(String(embed.data.footer.text))) {
      embed.setFooter({ ...(embed.data.footer || {}), text: getVisualFooterLabel(guildConfig) });
    }
    if (typeof embed.data.description === 'string') embed.setDescription(beautifyStructuredLines(embed.data.description).slice(0, 4096));
    if (Array.isArray(embed.data.fields) && embed.data.fields.length) {
      embed.setFields(embed.data.fields.map((field) => ({
        ...field,
        name: String(field?.name || '•').trim().slice(0, 256),
        value: beautifyStructuredLines(field?.value || '—').slice(0, 1024)
      })));
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


function applyGuildPayloadBranding(payload = {}, guild, guildConfig = {}) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.embeds) || !guild) return payload;
  const iconURL = guild.iconURL?.({ size: 256 }) || guild.iconURL?.() || null;
  if (!iconURL) return payload;
  const embeds = payload.embeds.map((input) => {
    let embed;
    try { embed = EmbedBuilder.from(input); } catch { embed = new EmbedBuilder(input || {}); }
    const author = embed.data?.author || {};
    if (!author.iconURL && !author.icon_url) {
      embed.setAuthor({ ...author, name: author.name || getVisualAuthorLabel(guildConfig), iconURL });
    }
    const descLen = String(embed.data?.description || '').length;
    const fieldCount = Array.isArray(embed.data?.fields) ? embed.data.fields.length : 0;
    const title = String(embed.data?.title || '').toLowerCase();
    const isHub = /(help|aide|panel|dashboard|hub|config|setup|logs|support|security|sécurité|voice|vocal|roles|rôles|embed)/i.test(title);
    if (!embed.data?.thumbnail && !embed.data?.image && (isHub || fieldCount >= 2 || descLen >= 180)) {
      embed.setThumbnail(iconURL);
    }
    return embed;
  });
  return { ...payload, embeds };
}

function resolveBaseEmbedColor(guildConfig, title, description) {
  const palette = getVisualPalette(guildConfig);
  return ensureHexColor(guildConfig?.embedColor, palette.base || '#5865F2');
}

function baseEmbed(guildConfig, title, description) {
  const resolvedDescription = Array.isArray(description)
    ? description.filter(Boolean).join('\n')
    : String(description || '').trim();
  return applyEmbedVisualStyle(new EmbedBuilder()
    .setColor(resolveBaseEmbedColor(guildConfig, title, resolvedDescription))
    .setTitle(translateText(String(title || 'Neyora'), guildConfig).slice(0, 256))
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


function safeUiText(value, max = 80) {
  return String(value ?? '').slice(0, Math.max(1, max));
}

function sanitizeComponentBuilder(component, options = {}) {
  if (!component || typeof component !== 'object') return component;
  const isModal = Boolean(options.isModal);
  const data = component.data || component;

  const customId = data.custom_id ?? data.customId;
  if (customId && typeof component.setCustomId === 'function') component.setCustomId(safeUiText(customId, 100));

  const labelLimit = isModal ? 45 : 80;
  const label = data.label;
  if (label && typeof component.setLabel === 'function') component.setLabel(safeUiText(label, labelLimit));

  const placeholder = data.placeholder;
  if (placeholder && typeof component.setPlaceholder === 'function') component.setPlaceholder(safeUiText(placeholder, isModal ? 100 : 150));

  const title = data.title;
  if (title && typeof component.setTitle === 'function') component.setTitle(safeUiText(title, 45));

  const value = data.value;
  if (typeof value === 'string' && typeof component.setValue === 'function') component.setValue(safeUiText(value, isModal ? 4000 : 100));

  const optionsList = Array.isArray(data.options) ? data.options.slice(0, 25).map((option) => ({
    ...option,
    label: safeUiText(option.label, 100),
    value: safeUiText(option.value, 100),
    description: option.description ? safeUiText(option.description, 100) : option.description
  })) : null;
  if (optionsList) {
    if (typeof component.setOptions === 'function') component.setOptions(optionsList);
    else component.data.options = optionsList;
  }

  return component;
}

function sanitizeActionRows(rows = [], options = {}) {
  const maxRows = Math.max(1, options.maxRows || 5);
  const maxComponentsPerRow = Math.max(1, options.maxComponentsPerRow || (options.isModal ? 1 : 5));
  const out = [];
  const seenCustomIds = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row) continue;
    const sourceComponents = Array.isArray(row.components) ? row.components : Array.isArray(row?.data?.components) ? row.data.components : [];
    const sanitizedComponents = sourceComponents
      .map((component) => sanitizeComponentBuilder(component, options))
      .filter(Boolean)
      .filter((component) => {
        const customId = component?.data?.custom_id;
        if (!customId) return true;
        if (seenCustomIds.has(customId)) return false;
        seenCustomIds.add(customId);
        return true;
      });
    for (let index = 0; index < sanitizedComponents.length; index += maxComponentsPerRow) {
      if (out.length >= maxRows) break;
      const chunked = sanitizedComponents.slice(index, index + maxComponentsPerRow);
      if (!chunked.length) continue;
      out.push(new ActionRowBuilder().addComponents(...chunked));
    }
    if (out.length >= maxRows) break;
  }
  return out.slice(0, maxRows);
}

function sanitizeModalBuilder(modal) {
  if (!modal || typeof modal !== 'object') return modal;
  const data = modal.data || modal;
  if (data.custom_id && typeof modal.setCustomId === 'function') modal.setCustomId(safeUiText(data.custom_id, 100));
  if (data.title && typeof modal.setTitle === 'function') modal.setTitle(safeUiText(data.title, 45));
  const rows = Array.isArray(modal.components) ? modal.components : Array.isArray(data.components) ? data.components : [];
  modal.components = sanitizeActionRows(rows, { isModal: true, maxRows: 5, maxComponentsPerRow: 1 });
  return modal;
}

function sanitizeDiscordPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  if (Array.isArray(next.components)) next.components = sanitizeActionRows(next.components, { maxRows: 5, maxComponentsPerRow: 5 });
  return next;
}

module.exports = {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  normalizeActivityType,
  randomOf,
  clamp,
  ensureHexColor,
  resolveVisualThemeKey,
  getVisualPalette,
  pickVisualColor,
  parseDuration,
  formatDuration,
  translateText,
  applyEmbedVisualStyle,
  localizePayload,
  normalizeSystemNoticePayload,
  applyGuildPayloadBranding,
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
  makeInviteUrl,
  sanitizeActionRows,
  sanitizeModalBuilder,
  sanitizeDiscordPayload
};
