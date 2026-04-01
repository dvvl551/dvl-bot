
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
