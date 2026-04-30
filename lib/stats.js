const db = require('./db');

function getSprintBurndown(sprintId) {
  const total = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE sprint_id = ? AND archived = 0`).get(sprintId).count;
  const totalEstimate = db.prepare(`SELECT COALESCE(SUM(estimate), 0) as sum FROM tasks WHERE sprint_id = ? AND archived = 0`).get(sprintId).sum;
  const completions = db.prepare(`
    SELECT date(al.created_at) as day, COUNT(*) as count, COALESCE(SUM(t.estimate), 0) as estimate
    FROM activity_log al
    JOIN tasks t ON t.id = al.task_id
    WHERE t.sprint_id = ? AND al.action = 'moved' AND al.new_value = 'completed'
    GROUP BY date(al.created_at)
    ORDER BY day
  `).all(sprintId);
  return { total, totalEstimate, completions };
}

function getAssigneeWorkload() {
  return db.prepare(`
    SELECT p.id, p.name, p.color, COUNT(t.id) as task_count, COALESCE(SUM(t.estimate), 0) as total_estimate
    FROM people p
    LEFT JOIN tasks t ON t.assignee_id = p.id AND t.archived = 0
    GROUP BY p.id
    ORDER BY task_count DESC
  `).all();
}

module.exports = { getSprintBurndown, getAssigneeWorkload };
