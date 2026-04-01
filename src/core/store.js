
const fs = require('fs');
const path = require('path');
const { DEFAULT_GUILD, DEFAULT_GLOBAL } = require('./defaults');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'database.json');

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

class Store {
  constructor() {
    this.db = { global: clone(DEFAULT_GLOBAL), guilds: {} };
    this.saveTimer = null;
  }

  init() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
      return;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
      this.db.global = merge(clone(DEFAULT_GLOBAL), parsed.global || {});
      this.db.guilds = parsed.guilds || {};
    } catch (error) {
      console.error('Failed to read database.json, recreating it.', error);
      this.flush();
    }
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }

  flush() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
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
