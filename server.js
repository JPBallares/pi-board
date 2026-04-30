const express = require('express');
const path = require('path');
const {
  createTask, updateTask, listTasks, getTask, deleteTask, moveTask,
  createSprint, completeSprint, incompleteSprint, listSprints, getActiveSprint, updateSprint, deleteSprint,
  createLabel, listLabels, updateLabel, deleteLabel,
  createPerson, listPeople, updatePerson, deletePerson,
  createSubtask, getSubtask, listSubtasks, toggleSubtask, updateSubtask, deleteSubtask,
  STATUSES,
} = require('./lib/board');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = listTasks({
      sprint_id: req.query.sprint_id,
      status: req.query.status,
      search: req.query.search,
      assignee_id: req.query.assignee_id,
      labelIds: req.query.label_ids ? req.query.label_ids.split(',').map(Number) : undefined,
      archived: req.query.archived === '1' || req.query.archived === 'true',
      sortBy: req.query.sort_by,
      sortOrder: req.query.sort_order,
    });
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = getTask(Number(req.params.id));
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
    const task = updateTask(Number(req.params.id), req.body);
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const task = deleteTask(Number(req.params.id));
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/move', (req, res) => {
  try {
    const task = moveTask(Number(req.params.id), req.body.status, req.body.order);
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/duplicate', (req, res) => {
  try {
    const task = require('./lib/board').duplicateTask(Number(req.params.id));
    res.status(201).json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Subtasks
app.get('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const subtasks = listSubtasks(Number(req.params.id));
    res.json({ subtasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/subtasks', (req, res) => {
  try {
    const subtask = createSubtask(req.body);
    res.status(201).json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/subtasks/:id', (req, res) => {
  try {
    const subtask = updateSubtask(Number(req.params.id), req.body);
    res.json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/subtasks/:id/toggle', (req, res) => {
  try {
    const subtask = toggleSubtask(Number(req.params.id));
    res.json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    deleteSubtask(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Sprints
app.get('/api/sprints', (_req, res) => {
  try {
    res.json({ sprints: listSprints(), active: getActiveSprint() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sprints', (req, res) => {
  try {
    const sprint = createSprint(req.body.name, req.body.start_date, req.body.end_date);
    res.status(201).json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/sprints/:id/complete', (req, res) => {
  try {
    const sprint = completeSprint(Number(req.params.id));
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/sprints/:id/incomplete', (req, res) => {
  try {
    const sprint = incompleteSprint(Number(req.params.id));
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/sprints/:id', (req, res) => {
  try {
    const sprint = updateSprint(Number(req.params.id), req.body);
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/sprints/:id', (req, res) => {
  try {
    deleteSprint(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Labels
app.get('/api/labels', (_req, res) => {
  try {
    res.json({ labels: listLabels() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/labels', (req, res) => {
  try {
    const label = createLabel(req.body.name, req.body.color);
    res.status(201).json({ label });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/labels/:id', (req, res) => {
  try {
    const label = updateLabel(Number(req.params.id), req.body.name, req.body.color);
    res.json({ label });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/labels/:id', (req, res) => {
  try {
    deleteLabel(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// People
app.get('/api/people', (_req, res) => {
  try {
    res.json({ people: listPeople() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/people', (req, res) => {
  try {
    const person = createPerson(req.body.name, req.body.color);
    res.status(201).json({ person });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/people/:id', (req, res) => {
  try {
    const person = updatePerson(Number(req.params.id), req.body.name, req.body.color);
    res.json({ person });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/people/:id', (req, res) => {
  try {
    deletePerson(Number(req.params.id));
    res.json({ ok: true });
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
