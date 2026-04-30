const db = require('./db');

function createPerson(name, color) {
  const result = db.prepare(`INSERT INTO people (name, color) VALUES (?, ?)`).run(name, color || '#4ade80');
  return getPerson(result.lastInsertRowid);
}

function getPerson(id) {
  return db.prepare(`SELECT * FROM people WHERE id = ?`).get(id) || null;
}

function listPeople() {
  return db.prepare(`SELECT * FROM people ORDER BY name`).all();
}

function updatePerson(id, name, color) {
  db.prepare(`UPDATE people SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?`).run(name, color, id);
  return getPerson(id);
}

function deletePerson(id) {
  db.prepare(`UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?`).run(id);
  db.prepare(`DELETE FROM people WHERE id = ?`).run(id);
  return { id };
}

module.exports = {
  createPerson,
  getPerson,
  listPeople,
  updatePerson,
  deletePerson,
};
