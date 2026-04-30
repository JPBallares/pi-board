const db = require('./db');

function exportAll() {
  return {
    sprints: db.prepare('SELECT * FROM sprints').all(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    labels: db.prepare('SELECT * FROM labels').all(),
    people: db.prepare('SELECT * FROM people').all(),
    task_labels: db.prepare('SELECT * FROM task_labels').all(),
    task_dependencies: db.prepare('SELECT * FROM task_dependencies').all(),
    subtasks: db.prepare('SELECT * FROM subtasks').all(),
    column_settings: db.prepare('SELECT * FROM column_settings').all(),
  };
}

function importAll(data) {
  const insertSprint = db.prepare('INSERT INTO sprints (id, name, status, start_date, end_date, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertLabel = db.prepare('INSERT INTO labels (id, name, color) VALUES (?, ?, ?)');
  const insertPerson = db.prepare('INSERT INTO people (id, name, color) VALUES (?, ?, ?)');
  const insertTask = db.prepare('INSERT INTO tasks (id, title, description, sprint_id, status, type, assignee_id, priority, "order", created_at, updated_at, due_date, estimate, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertTaskLabel = db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)');
  const insertTaskDep = db.prepare('INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)');
  const insertSubtask = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, "order", created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const insertColSetting = db.prepare('INSERT INTO column_settings (status, wip_limit) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM subtasks').run();
    db.prepare('DELETE FROM task_dependencies').run();
    db.prepare('DELETE FROM task_labels').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM labels').run();
    db.prepare('DELETE FROM people').run();
    db.prepare('DELETE FROM sprints').run();
    db.prepare('DELETE FROM column_settings').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('sprints','tasks','labels','people','subtasks')").run();

    for (const s of data.sprints || []) {
      insertSprint.run(s.id, s.name, s.status, s.start_date, s.end_date, s.created_at, s.completed_at);
    }
    for (const l of data.labels || []) {
      insertLabel.run(l.id, l.name, l.color);
    }
    for (const p of data.people || []) {
      insertPerson.run(p.id, p.name, p.color);
    }
    for (const t of data.tasks || []) {
      insertTask.run(t.id, t.title, t.description, t.sprint_id, t.status, t.type, t.assignee_id, t.priority, t.order, t.created_at, t.updated_at, t.due_date, t.estimate, t.archived);
    }
    for (const tl of data.task_labels || []) {
      insertTaskLabel.run(tl.task_id, tl.label_id);
    }
    for (const td of data.task_dependencies || []) {
      insertTaskDep.run(td.task_id, td.depends_on_task_id);
    }
    for (const st of data.subtasks || []) {
      insertSubtask.run(st.id, st.task_id, st.title, st.completed, st.order, st.created_at);
    }
    for (const cs of data.column_settings || []) {
      insertColSetting.run(cs.status, cs.wip_limit);
    }
  });

  transaction();
  return { ok: true };
}

module.exports = { exportAll, importAll };
