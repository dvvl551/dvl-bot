const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DEFAULT_GUILD, DEFAULT_GLOBAL, syncGuildLocalizedDefaults } = require('./defaults');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'database.json');
const SNAPSHOT_DIR = path.join(DB_DIR, 'snapshots');
const MAX_SAFETY_SNAPSHOTS = 24;
const SNAPSHOT_COOLDOWN_MS = 30 * 60 * 1000;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, target) {
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(target || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = merge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
}

function writeFileAtomic(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

function pruneSnapshotFiles() {
  if (!fs.existsSync(SNAPSHOT_DIR)) return;
  const files = fs.readdirSync(SNAPSHOT_DIR)
    .filter((name) => /^database-.*\.json$/i.test(name))
    .map((name) => ({
      name,
      filePath: path.join(SNAPSHOT_DIR, name),
      time: fs.statSync(path.join(SNAPSHOT_DIR, name)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);
  for (const entry of files.slice(MAX_SAFETY_SNAPSHOTS)) {
    fs.unlinkSync(entry.filePath);
  }
}

function formatSnapshotStamp(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ];
  return parts.join('');
}

function migrateGuildShape(guild) {
  if (!guild || typeof guild !== 'object') return guild;
  guild.welcome = guild.welcome || {};
  guild.leave = guild.leave || {};
  if (guild.leave.dmTitle == null && typeof guild.leave.dmTitre === 'string') guild.leave.dmTitle = guild.leave.dmTitre;
  delete guild.leave.dmTitre;
  if (guild.welcome.dmTitle == null && typeof guild.welcome.dmTitre === 'string') guild.welcome.dmTitle = guild.welcome.dmTitre;
  delete guild.welcome.dmTitre;
  return guild;
}

class Store {
  constructor() {
    this.db = { global: clone(DEFAULT_GLOBAL), guilds: {} };
    this.saveTimer = null;
    this.lastSafetySnapshotAt = 0;
    this.lastSafetySnapshotHash = null;
  }

  captureSafetySnapshot(reason = 'autosave', { force = false } = {}) {
    ensureDir(DB_DIR);
    ensureDir(SNAPSHOT_DIR);
    if (!fs.existsSync(DB_PATH)) return null;

    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!String(raw || '').trim()) return null;

    const hash = crypto.createHash('sha1').update(raw).digest('hex');
    const now = Date.now();
    if (!force && this.lastSafetySnapshotHash === hash && now - this.lastSafetySnapshotAt < SNAPSHOT_COOLDOWN_MS) {
      return null;
    }

    const safeReason = String(reason || 'autosave').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'autosave';
    const fileName = `database-${formatSnapshotStamp(new Date(now))}-${safeReason}.json`;
    const targetPath = path.join(SNAPSHOT_DIR, fileName);
    fs.writeFileSync(targetPath, raw);
    this.lastSafetySnapshotAt = now;
    this.lastSafetySnapshotHash = hash;
    pruneSnapshotFiles();
    return targetPath;
  }

  listSafetySnapshots() {
    ensureDir(SNAPSHOT_DIR);
    return fs.readdirSync(SNAPSHOT_DIR)
      .filter((name) => /^database-.*\.json$/i.test(name))
      .map((name) => {
        const filePath = path.join(SNAPSHOT_DIR, name);
        const stats = fs.statSync(filePath);
        return {
          name,
          path: filePath,
          size: stats.size,
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  readLatestSafetySnapshot() {
    const snapshots = this.listSafetySnapshots();
    for (const entry of snapshots) {
      try {
        return { entry, parsed: readJsonFile(entry.path) };
      } catch {
        continue;
      }
    }
    return null;
  }

  init() {
    ensureDir(DB_DIR);
    ensureDir(SNAPSHOT_DIR);

    if (!fs.existsSync(DB_PATH)) {
      writeFileAtomic(DB_PATH, JSON.stringify(this.db, null, 2));
      this.captureSafetySnapshot('fresh-start', { force: true });
      return;
    }

    this.captureSafetySnapshot('startup', { force: true });

    try {
      const parsed = readJsonFile(DB_PATH);
      this.db.global = merge(clone(DEFAULT_GLOBAL), parsed.global || {});
      this.db.guilds = parsed.guilds || {};
    } catch (error) {
      console.error('Failed to read database.json, trying latest safety snapshot.', error);
      const recovered = this.readLatestSafetySnapshot();
      if (recovered?.parsed) {
        this.db.global = merge(clone(DEFAULT_GLOBAL), recovered.parsed.global || {});
        this.db.guilds = recovered.parsed.guilds || {};
        writeFileAtomic(DB_PATH, JSON.stringify(recovered.parsed, null, 2));
        console.warn(`Recovered database.json from safety snapshot: ${recovered.entry.name}`);
      } else {
        console.error('No valid safety snapshot found, recreating database.json.');
        this.flush({ forceSnapshot: false });
      }
    }
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }

  flush(options = {}) {
    const { forceSnapshot = false } = options;
    ensureDir(DB_DIR);
    ensureDir(SNAPSHOT_DIR);
    if (fs.existsSync(DB_PATH)) this.captureSafetySnapshot('pre-save', { force: forceSnapshot });
    writeFileAtomic(DB_PATH, JSON.stringify(this.db, null, 2));
  }

  getGlobal() {
    this.db.global = merge(clone(DEFAULT_GLOBAL), this.db.global || {});
    return this.db.global;
  }

  updateGlobal(mutator) {
    const current = merge(clone(DEFAULT_GLOBAL), this.db.global || {});
    const next = mutator(current) || current;
    this.db.global = next;
    this.scheduleSave();
    return next;
  }

  ensureGuild(guildId) {
    if (!this.db.guilds[guildId]) this.db.guilds[guildId] = clone(DEFAULT_GUILD);
    else this.db.guilds[guildId] = merge(clone(DEFAULT_GUILD), this.db.guilds[guildId]);
    this.db.guilds[guildId] = migrateGuildShape(this.db.guilds[guildId]);
    this.db.guilds[guildId] = syncGuildLocalizedDefaults(this.db.guilds[guildId], this.db.guilds[guildId]?.language || DEFAULT_GUILD.language || 'fr');
    return this.db.guilds[guildId];
  }

  getGuild(guildId) {
    return this.ensureGuild(guildId);
  }

  updateGuild(guildId, mutator) {
    const current = this.ensureGuild(guildId);
    const next = mutator(current) || current;
    this.db.guilds[guildId] = next;
    this.scheduleSave();
    return next;
  }
}

module.exports = { Store, clone, merge };
