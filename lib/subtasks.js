const db = require('./db');

function createSubtask({ task_id, title, order }) {
  if (!title) throw new Error('Subtask title is required');
  const insert = db.prepare(`
    INSERT INTO subtasks (task_id, title, "order")
    VALUES (?, ?, ?)
  `);
  const result = insert.run(task_id, title, order || 0);
  return getSubtask(result.lastInsertRowid);
}

function getSubtask(id) {
  return db.prepare(`SELECT * FROM subtasks WHERE id = ?`).get(id) || null;
}

function listSubtasks(taskId) {
  return db.prepare(`
    SELECT * FROM subtasks WHERE task_id = ? ORDER BY "order" ASC, created_at ASC
  `).all(taskId);
}

function toggleSubtask(id) {
  const existing = getSubtask(id);
  if (!existing) throw new Error(`Subtask not found: ${id}`);
  db.prepare(`UPDATE subtasks SET completed = NOT completed WHERE id = ?`).run(id);
  return getSubtask(id);
}

function updateSubtask(id, updates) {
  const existing = getSubtask(id);
  if (!existing) throw new Error(`Subtask not found: ${id}`);
  const fields = [];
  const values = [];
  if ('title' in updates) { fields.push('title = ?'); values.push(updates.title); }
  if ('order' in updates) { fields.push('"order" = ?'); values.push(updates.order); }
  if (fields.length > 0) {
    const sql = `UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.prepare(sql).run(...values);
  }
  return getSubtask(id);
}

function deleteSubtask(id) {
  const subtask = getSubtask(id);
  if (!subtask) throw new Error(`Subtask not found: ${id}`);
  db.prepare(`DELETE FROM subtasks WHERE id = ?`).run(id);
  return subtask;
}

module.exports = {
  createSubtask,
  getSubtask,
  listSubtasks,
  toggleSubtask,
  updateSubtask,
  deleteSubtask,
};
