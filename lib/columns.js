const db = require('./db');

function getColumnSettings() {
  return db.prepare(`SELECT * FROM column_settings`).all();
}

function getColumnSetting(status) {
  return db.prepare(`SELECT * FROM column_settings WHERE status = ?`).get(status) || null;
}

function setColumnSetting(status, wip_limit) {
  const existing = getColumnSetting(status);
  if (existing) {
    db.prepare(`UPDATE column_settings SET wip_limit = ? WHERE status = ?`).run(wip_limit, status);
  } else {
    db.prepare(`INSERT INTO column_settings (status, wip_limit) VALUES (?, ?)`).run(status, wip_limit);
  }
  return getColumnSetting(status);
}

module.exports = {
  getColumnSettings,
  getColumnSetting,
  setColumnSetting,
};
