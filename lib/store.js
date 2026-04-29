const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(process.cwd(), '.pi');
const STORE_FILE = path.join(STORE_DIR, 'board.json');

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ tasks: [] }, null, 2));
  }
}

function readTasks() {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, 'utf-8');
  return JSON.parse(raw).tasks || [];
}

function writeTasks(tasks) {
  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify({ tasks }, null, 2));
}

module.exports = { readTasks, writeTasks };
