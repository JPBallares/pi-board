const db = require('./db');

function listColumns() {
  return db.prepare('SELECT * FROM columns ORDER BY position ASC, id ASC').all();
}

function getColumn(key) {
  return db.prepare('SELECT * FROM columns WHERE key = ?').get(key) || null;
}

function createColumn({ key, name, color, position, wip_limit }) {
  if (!key) throw new Error('Column key is required');
  if (!name) throw new Error('Column name is required');
  if (!/^[a-z0-9-]+$/.test(key)) throw new Error('Key must be lowercase alphanumeric with hyphens');

  const existing = getColumn(key);
  if (existing) throw new Error(`Column already exists: ${key}`);

  db.prepare(`
    INSERT INTO columns (key, name, color, position, wip_limit)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, name, color || '#94a3b8', position !== undefined ? position : 0, wip_limit || null);

  return getColumn(key);
}

function updateColumn(key, updates) {
  const existing = getColumn(key);
  if (!existing) throw new Error(`Column not found: ${key}`);

  const fields = [];
  const values = [];

  if ('name' in updates) { fields.push('name = ?'); values.push(updates.name); }
  if ('color' in updates) { fields.push('color = ?'); values.push(updates.color); }
  if ('position' in updates) { fields.push('position = ?'); values.push(updates.position); }
  if ('wip_limit' in updates) { fields.push('wip_limit = ?'); values.push(updates.wip_limit); }

  if (fields.length === 0) return existing;

  values.push(key);
  db.prepare(`UPDATE columns SET ${fields.join(', ')} WHERE key = ?`).run(...values);
  return getColumn(key);
}

function deleteColumn(key) {
  const existing = getColumn(key);
  if (!existing) throw new Error(`Column not found: ${key}`);

  const count = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get(key).count;
  if (count > 0) throw new Error('Cannot delete column with tasks');

  db.prepare('DELETE FROM columns WHERE key = ?').run(key);
  return existing;
}

function getBoardSetting(key) {
  const row = db.prepare('SELECT value FROM board_settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setBoardSetting(key, value) {
  const existing = db.prepare('SELECT 1 FROM board_settings WHERE key = ?').get(key);
  if (existing) {
    db.prepare('UPDATE board_settings SET value = ? WHERE key = ?').run(value, key);
  } else {
    db.prepare('INSERT INTO board_settings (key, value) VALUES (?, ?)').run(key, value);
  }
  return { key, value };
}

module.exports = {
  listColumns,
  getColumn,
  createColumn,
  updateColumn,
  deleteColumn,
  getBoardSetting,
  setBoardSetting,
};
