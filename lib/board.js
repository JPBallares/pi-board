const tasks = require('./tasks');
const sprints = require('./sprints');
const labels = require('./labels');
const people = require('./people');

module.exports = {
  STATUSES: tasks.STATUSES,
  // tasks
  createTask: tasks.createTask,
  getTask: tasks.getTask,
  listTasks: tasks.listTasks,
  updateTask: tasks.updateTask,
  moveTask: tasks.moveTask,
  deleteTask: tasks.deleteTask,
  // sprints
  createSprint: sprints.createSprint,
  getSprint: sprints.getSprint,
  getActiveSprint: sprints.getActiveSprint,
  listSprints: sprints.listSprints,
  completeSprint: sprints.completeSprint,
  deleteSprint: sprints.deleteSprint,
  // labels
  createLabel: labels.createLabel,
  getLabel: labels.getLabel,
  listLabels: labels.listLabels,
  updateLabel: labels.updateLabel,
  deleteLabel: labels.deleteLabel,
  // people
  createPerson: people.createPerson,
  getPerson: people.getPerson,
  listPeople: people.listPeople,
  updatePerson: people.updatePerson,
  deletePerson: people.deletePerson,
};
