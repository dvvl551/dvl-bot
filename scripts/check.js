const fs = require('fs');
const path = require('path');
const vm = require('vm');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(target));
    else if (entry.name.endsWith('.js')) out.push(target);
  }
  return out;
}

function syntaxCheck() {
  const files = walk(path.join(__dirname, '..', 'src'));
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    try {
      new vm.Script(code, { filename: file });
      console.log('OK', path.relative(path.join(__dirname, '..'), file));
    } catch (error) {
      console.error('FAIL', file);
      console.error(error);
      process.exit(1);
    }
  }
  console.log('Syntax check passed.');
}

function extractConfigHelpGroups(source) {
  const match = source.match(/const CONFIG_HELP_GROUPS = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('CONFIG_HELP_GROUPS block not found');
  return Function(`"use strict"; return (${match[1]});`)();
}

function auditCommands() {
  const commandsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'commands.js'), 'utf8');
  const groups = extractConfigHelpGroups(commandsSource);
  const {
    createCommands,
    createHelpComponents,
    createConfigPanelComponents,
    createSupportPanelComponents,
    createVoicePanelComponents,
    createDashboardComponents
  } = require('../src/core/commands');

  const commands = createCommands();
  const seen = new Map();
  const duplicates = [];
  for (const command of commands) {
    for (const key of [command.name, ...(command.aliases || [])]) {
      const normalized = String(key || '').trim().toLowerCase();
      if (!normalized) continue;
      if (seen.has(normalized)) duplicates.push([normalized, seen.get(normalized), command.name]);
      else seen.set(normalized, command.name);
    }
  }
  if (duplicates.length) {
    throw new Error(`Duplicate command names/aliases found: ${duplicates.map(([key, first, second]) => `${key} (${first} / ${second})`).join(', ')}`);
  }

  const commandNames = new Set(commands.map((command) => command.name));
  const missingSetupRefs = [];
  for (const [groupName, names] of Object.entries(groups)) {
    for (const name of names) {
      if (!commandNames.has(name)) missingSetupRefs.push(`${groupName}: ${name}`);
    }
  }
  if (missingSetupRefs.length) {
    throw new Error(`Unknown command names in CONFIG_HELP_GROUPS: ${missingSetupRefs.join(', ')}`);
  }

  const checkRows = (label, rows) => {
    rows.forEach((row, index) => {
      const count = row?.components?.length || 0;
      if (count > 5) throw new Error(`${label} row ${index + 1} has ${count} components (Discord max is 5)`);
    });
  };

  checkRows('help home', createHelpComponents('Home', 1, 1));
  checkRows('help categories', createHelpComponents('Categories', 1, 2));
  checkRows('help logs', createHelpComponents('Logs', 1, 2));

  const panelPages = ['home', 'texts', 'welcome', 'leave', 'leave-dm', 'boost', 'logs', 'support', 'security', 'automation', 'channels', 'style', 'repair', 'deploy'];
  panelPages.forEach((page) => checkRows(`config panel ${page}`, createConfigPanelComponents(page, '123456789012345678')));

  checkRows('support panel', createSupportPanelComponents());
  checkRows('voice panel', createVoicePanelComponents());
  ['home', 'setup', 'logs', 'security', 'voice', 'automation', 'progress', 'tools'].forEach((page) => {
    checkRows(`dashboard ${page}`, createDashboardComponents(page));
  });

  console.log(`Metadata audit passed. Commands: ${commands.length}. Visible: ${commands.filter((command) => !command.hidden).length}.`);
}

syntaxCheck();
auditCommands();
