const express = require('express');
const path = require('path');
const { createTask, updateTask, listTasks, getTask, deleteTask, STATUSES } = require('./lib/board');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = listTasks({ sprint: req.query.sprint, status: req.query.status });
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ task });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = createTask(req.body);
    res.status(201).json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const task = updateTask(req.params.id, req.body);
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const task = deleteTask(req.params.id);
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/statuses', (_req, res) => res.json({ statuses: STATUSES }));

let serverInstance = null;

function start(port = 3333) {
  if (serverInstance) {
    return { alreadyRunning: true, port };
  }
  serverInstance = app.listen(port, () => {
    console.log(`pi-board server running at http://localhost:${port}`);
  });
  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} already in use, assuming another pi-board instance is running.`);
    } else {
      console.error('Server error:', err);
    }
  });
  return { alreadyRunning: false, port };
}

module.exports = { app, start };

if (require.main === module) {
  start(process.env.PI_BOARD_PORT || 3333);
}
