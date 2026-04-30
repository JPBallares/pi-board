const db = require('./db');
const { createPerson } = require('./people');

const STATUSES = ['backlog', 'in-progress', 'code-review', 'uat', 'completed'];

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function createTask({ title, description, sprint_id, status, type, assignee_id, assigneeName, assigneeColor, priority, order, labelIds }) {
  if (!title) throw new Error('Title is required');
  const finalStatus = STATUSES.includes(status) ? status : 'backlog';
  const finalType = ['bug', 'feature', 'chore'].includes(type) ? type : 'feature';
  const finalPriority = PRIORITY_ORDER[priority] !== undefined ? priority : 'medium';

  let finalAssigneeId = assignee_id || null;
  if (!finalAssigneeId && assigneeName) {
    const existing = db.prepare(`SELECT id FROM people WHERE name = ?`).get(assigneeName);
    if (existing) {
      finalAssigneeId = existing.id;
    } else {
      const person = createPerson(assigneeName, assigneeColor);
      finalAssigneeId = person.id;
    }
  }

  const insert = db.prepare(`
    INSERT INTO tasks (title, description, sprint_id, status, type, assignee_id, priority, "order")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insert.run(title, description || '', sprint_id || null, finalStatus, finalType, finalAssigneeId, finalPriority, order || 0);
  const taskId = result.lastInsertRowid;

  if (Array.isArray(labelIds) && labelIds.length > 0) {
    const insertLabel = db.prepare(`INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`);
    for (const lid of labelIds) {
      insertLabel.run(taskId, lid);
    }
  }

  return getTask(taskId);
}

function getTask(id) {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
  if (!task) return null;
  return enrichTask(task);
}

function enrichTask(task) {
  const labels = db.prepare(`
    SELECT l.id, l.name, l.color FROM labels l
    JOIN task_labels tl ON tl.label_id = l.id
    WHERE tl.task_id = ?
    ORDER BY l.name
  `).all(task.id);

  const assignee = task.assignee_id
    ? db.prepare(`SELECT id, name, color FROM people WHERE id = ?`).get(task.assignee_id)
    : null;

  return { ...task, labels, assignee };
}

function listTasks({ sprint_id, status, search, sortBy, sortOrder } = {}) {
  let sql = `SELECT * FROM tasks WHERE 1=1`;
  const params = [];

  if (sprint_id !== undefined && sprint_id !== null && sprint_id !== '') {
    sql += ` AND sprint_id = ?`;
    params.push(sprint_id);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (search) {
    sql += ` AND title LIKE ?`;
    params.push(`%${search}%`);
  }

  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
  if (sortBy === 'priority') {
    sql += ` ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ${orderDir}, "order" ASC`;
  } else if (sortBy === 'order') {
    sql += ` ORDER BY "order" ${orderDir}, created_at DESC`;
  } else if (sortBy === 'created_at') {
    sql += ` ORDER BY created_at ${orderDir}`;
  } else {
    sql += ` ORDER BY "order" ASC, created_at DESC`;
  }

  const tasks = db.prepare(sql).all(...params);
  return tasks.map(enrichTask);
}

function updateTask(id, updates) {
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
  if (!existing) throw new Error(`Task not found: ${id}`);

  let finalAssigneeId = updates.assignee_id !== undefined ? updates.assignee_id : existing.assignee_id;
  if ((finalAssigneeId === undefined || finalAssigneeId === null) && updates.assigneeName) {
    const person = db.prepare(`SELECT id FROM people WHERE name = ?`).get(updates.assigneeName);
    if (person) {
      finalAssigneeId = person.id;
    } else {
      const newPerson = createPerson(updates.assigneeName, updates.assigneeColor);
      finalAssigneeId = newPerson.id;
    }
  }

  const sql = `
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      sprint_id = COALESCE(?, sprint_id),
      status = COALESCE(?, status),
      type = COALESCE(?, type),
      assignee_id = ?,
      priority = COALESCE(?, priority),
      "order" = COALESCE(?, "order"),
      updated_at = datetime('now')
    WHERE id = ?
  `;
  db.prepare(sql).run(
    updates.title,
    updates.description,
    updates.sprint_id,
    updates.status,
    updates.type,
    finalAssigneeId,
    updates.priority,
    updates.order,
    id
  );

  if (updates.labelIds !== undefined) {
    db.prepare(`DELETE FROM task_labels WHERE task_id = ?`).run(id);
    if (Array.isArray(updates.labelIds) && updates.labelIds.length > 0) {
      const insert = db.prepare(`INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`);
      for (const lid of updates.labelIds) {
        insert.run(id, lid);
      }
    }
  }

  return getTask(id);
}

function moveTask(id, status, order) {
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const result = db.prepare(`UPDATE tasks SET status = ?, "order" = ?, updated_at = datetime('now') WHERE id = ?`).run(status, order, id);
  if (result.changes === 0) throw new Error(`Task not found: ${id}`);
  return getTask(id);
}

function deleteTask(id) {
  const task = getTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  db.prepare(`DELETE FROM task_labels WHERE task_id = ?`).run(id);
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return task;
}

module.exports = {
  STATUSES,
  createTask,
  getTask,
  listTasks,
  updateTask,
  moveTask,
  deleteTask,
};
