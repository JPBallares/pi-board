const { readTasks, writeTasks } = require('./store');

const STATUSES = ['backlog', 'in-progress', 'code-review', 'uat', 'completed'];

function generateId() {
  return 'task-' + Math.random().toString(36).slice(2, 9);
}

function now() {
  return new Date().toISOString();
}

function createTask({ title, description = '', sprint = 'default', status = 'backlog', assignee = '' }) {
  if (!title) throw new Error('Title is required');
  const task = {
    id: generateId(),
    title,
    description,
    sprint,
    status: STATUSES.includes(status) ? status : 'backlog',
    assignee,
    createdAt: now(),
    updatedAt: now(),
  };
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

function updateTask(id, updates) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Task not found: ${id}`);
  const task = tasks[idx];
  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.sprint !== undefined) task.sprint = updates.sprint;
  if (updates.status !== undefined && STATUSES.includes(updates.status)) task.status = updates.status;
  if (updates.assignee !== undefined) task.assignee = updates.assignee;
  task.updatedAt = now();
  tasks[idx] = task;
  writeTasks(tasks);
  return task;
}

function listTasks({ sprint, status } = {}) {
  let tasks = readTasks();
  if (sprint) tasks = tasks.filter(t => t.sprint === sprint);
  if (status) tasks = tasks.filter(t => t.status === status);
  return tasks;
}

function getTask(id) {
  return readTasks().find(t => t.id === id) || null;
}

function deleteTask(id) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Task not found: ${id}`);
  const removed = tasks.splice(idx, 1)[0];
  writeTasks(tasks);
  return removed;
}

module.exports = {
  createTask,
  updateTask,
  listTasks,
  getTask,
  deleteTask,
  STATUSES,
};
