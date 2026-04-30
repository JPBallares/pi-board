const db = require('./db');

function createLabel(name, color) {
  const result = db.prepare(`INSERT INTO labels (name, color) VALUES (?, ?)`).run(name, color || '#38bdf8');
  return getLabel(result.lastInsertRowid);
}

function getLabel(id) {
  return db.prepare(`SELECT * FROM labels WHERE id = ?`).get(id) || null;
}

function listLabels() {
  return db.prepare(`SELECT * FROM labels ORDER BY name`).all();
}

function updateLabel(id, name, color) {
  db.prepare(`UPDATE labels SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?`).run(name, color, id);
  return getLabel(id);
}

function deleteLabel(id) {
  db.prepare(`DELETE FROM task_labels WHERE label_id = ?`).run(id);
  db.prepare(`DELETE FROM labels WHERE id = ?`).run(id);
  return { id };
}

module.exports = {
  createLabel,
  getLabel,
  listLabels,
  updateLabel,
  deleteLabel,
};
