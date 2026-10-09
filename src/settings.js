const fs = require('node:fs');
const path = require('node:path');

// Settings changed from Discord with /ticket-setup, saved to data/settings.json so they
// survive restarts.
const FILE = path.join(__dirname, '..', 'data', 'settings.json');

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') console.error(`Could not read ${FILE}:`, error);
}

module.exports = {
  get supportRoleId() {
    return settings.supportRoleId ?? null;
  },
  get logChannelId() {
    return settings.logChannelId ?? null;
  },
  update(changes) {
    Object.assign(settings, changes);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(settings, null, 2));
  },
};
