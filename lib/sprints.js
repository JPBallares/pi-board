const db = require('./db');

function createSprint(name, startDate, endDate) {
  const deactivate = db.prepare(`UPDATE sprints SET status = 'completed', completed_at = datetime('now') WHERE status = 'active'`);
  const insert = db.prepare(`INSERT INTO sprints (name, status, start_date, end_date) VALUES (?, 'active', ?, ?)`);
  const transaction = db.transaction(() => {
    deactivate.run();
    const result = insert.run(name, startDate, endDate);
    return result.lastInsertRowid;
  });
  const id = transaction();
  return getSprint(id);
}

function getSprint(id) {
  return db.prepare(`SELECT * FROM sprints WHERE id = ?`).get(id) || null;
}

function getActiveSprint() {
  return db.prepare(`SELECT * FROM sprints WHERE status = 'active' LIMIT 1`).get() || null;
}

function listSprints() {
  return db.prepare(`SELECT * FROM sprints ORDER BY created_at DESC`).all();
}

function completeSprint(id) {
  const updateSprint = db.prepare(`UPDATE sprints SET status = 'completed', completed_at = datetime('now') WHERE id = ?`);
  const updateTasks = db.prepare(`UPDATE tasks SET status = 'completed', updated_at = datetime('now') WHERE sprint_id = ?`);
  const transaction = db.transaction(() => {
    updateSprint.run(id);
    updateTasks.run(id);
  });
  transaction();
  return getSprint(id);
}

function incompleteSprint(id) {
  const updateSprint = db.prepare(`UPDATE sprints SET status = 'active', completed_at = NULL WHERE id = ?`);
  updateSprint.run(id);
  return getSprint(id);
}

function updateSprint(id, { name, start_date, end_date }) {
  const existing = getSprint(id);
  if (!existing) throw new Error(`Sprint not found: ${id}`);

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (start_date !== undefined) { fields.push('start_date = ?'); values.push(start_date); }
  if (end_date !== undefined) { fields.push('end_date = ?'); values.push(end_date); }

  if (fields.length > 0) {
    const sql = `UPDATE sprints SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.prepare(sql).run(...values);
  }

  return getSprint(id);
}

function deleteSprint(id) {
  const taskCount = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE sprint_id = ?`).get(id).count;
  if (taskCount > 0) {
    throw new Error(`Cannot delete sprint with ${taskCount} tasks`);
  }
  db.prepare(`DELETE FROM sprints WHERE id = ?`).run(id);
  return { id };
}

module.exports = {
  createSprint,
  getSprint,
  getActiveSprint,
  listSprints,
  completeSprint,
  incompleteSprint,
  updateSprint,
  deleteSprint,
};
