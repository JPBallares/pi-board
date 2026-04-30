const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(process.cwd(), '.pi');
const DB_FILE = path.join(DB_DIR, 'board.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_FILE);

// Initial schema (fresh DBs get this directly — no CHECK on status)
db.exec(`
  CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#38bdf8'
  );

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#4ade80'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'backlog',
    type TEXT NOT NULL DEFAULT 'feature' CHECK(type IN ('bug', 'feature', 'chore')),
    assignee_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
    "order" INTEGER NOT NULL DEFAULT 0,
    due_date DATE,
    estimate INTEGER,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_labels (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
  );

  CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS column_settings (
    status TEXT PRIMARY KEY,
    wip_limit INTEGER
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL DEFAULT 'user',
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations: add columns safely to existing tables
const taskCols = db.prepare("PRAGMA table_info(tasks)").all();
if (!taskCols.find(c => c.name === 'due_date')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN due_date DATE;`);
}
if (!taskCols.find(c => c.name === 'estimate')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN estimate INTEGER;`);
}
if (!taskCols.find(c => c.name === 'archived')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;`);
}

// Migration: create columns table and board_settings
const hasColumnsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='columns'").get();
if (!hasColumnsTable) {
  db.exec(`
    CREATE TABLE columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#94a3b8',
      position INTEGER NOT NULL DEFAULT 0,
      wip_limit INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE board_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrate old column_settings into columns
  const oldSettings = db.prepare('SELECT * FROM column_settings').all();
  const defaults = [
    { key: 'backlog', name: 'Backlog', color: '#94a3b8', position: 0 },
    { key: 'in-progress', name: 'In Progress', color: '#38bdf8', position: 1 },
    { key: 'code-review', name: 'Code Review', color: '#a78bfa', position: 2 },
    { key: 'uat', name: 'UAT', color: '#fbbf24', position: 3 },
    { key: 'completed', name: 'Completed', color: '#4ade80', position: 4 },
  ];

  const insertCol = db.prepare('INSERT INTO columns (key, name, color, position, wip_limit) VALUES (?, ?, ?, ?, ?)');
  for (const d of defaults) {
    const wip = oldSettings.find(s => s.status === d.key);
    insertCol.run(d.key, d.name, d.color, d.position, wip ? wip.wip_limit : null);
  }

  // Default board settings
  db.prepare("INSERT OR IGNORE INTO board_settings (key, value) VALUES ('swimlane_group_by', 'none')").run();
}

// Migration: remove CHECK constraint from tasks.status
// Detect by inspecting the CREATE TABLE statement
const tasksSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get();
const needsTaskMigration = tasksSqlRow && tasksSqlRow.sql.includes('CHECK(status IN');

if (needsTaskMigration) {
  db.exec('PRAGMA foreign_keys = OFF;');

  // Backup dependent data
  const taskLabels = db.prepare('SELECT * FROM task_labels').all();
  const taskDeps = db.prepare('SELECT * FROM task_dependencies').all();
  const subtasksData = db.prepare('SELECT * FROM subtasks').all();
  const activityData = db.prepare('SELECT * FROM activity_log').all();
  const commentsData = db.prepare('SELECT * FROM comments').all();

  // Drop dependent tables
  db.exec('DROP TABLE IF EXISTS comments;');
  db.exec('DROP TABLE IF EXISTS activity_log;');
  db.exec('DROP TABLE IF EXISTS subtasks;');
  db.exec('DROP TABLE IF EXISTS task_dependencies;');
  db.exec('DROP TABLE IF EXISTS task_labels;');

  // Rename old tasks
  db.exec('ALTER TABLE tasks RENAME TO tasks_old;');

  // Create new tasks table without CHECK on status
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      type TEXT NOT NULL DEFAULT 'feature' CHECK(type IN ('bug', 'feature', 'chore')),
      assignee_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
      "order" INTEGER NOT NULL DEFAULT 0,
      due_date DATE,
      estimate INTEGER,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy tasks data (explicit columns because column order differs after ALTER TABLE migrations)
  db.exec(`
    INSERT INTO tasks (id, title, description, sprint_id, status, type, assignee_id, priority, "order", due_date, estimate, archived, created_at, updated_at)
    SELECT id, title, description, sprint_id, status, type, assignee_id, priority, "order", due_date, estimate, archived, created_at, updated_at FROM tasks_old;
  `);
  db.exec('DROP TABLE tasks_old;');

  // Recreate dependent tables
  db.exec(`
    CREATE TABLE task_labels (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE task_dependencies (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, depends_on_task_id)
    );

    CREATE TABLE subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author TEXT NOT NULL DEFAULT 'user',
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Restore data
  const insertTL = db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)');
  for (const row of taskLabels) insertTL.run(row.task_id, row.label_id);

  const insertTD = db.prepare('INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)');
  for (const row of taskDeps) insertTD.run(row.task_id, row.depends_on_task_id);

  const insertST = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, "order", created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const row of subtasksData) insertST.run(row.id, row.task_id, row.title, row.completed, row.order, row.created_at);

  const insertAL = db.prepare('INSERT INTO activity_log (id, task_id, action, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const row of activityData) insertAL.run(row.id, row.task_id, row.action, row.old_value, row.new_value, row.created_at);

  const insertCM = db.prepare('INSERT INTO comments (id, task_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)');
  for (const row of commentsData) insertCM.run(row.id, row.task_id, row.author, row.body, row.created_at);

  db.exec('PRAGMA foreign_keys = ON;');
}

module.exports = db;
