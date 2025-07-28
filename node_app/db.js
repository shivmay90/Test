const { spawnSync } = require('child_process');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.sqlite');

function execSql(sql, json = false) {
  const args = [];
  if (json) {
    args.push('-json', '-header');
  }
  args.push(DB_FILE, sql);
  const result = spawnSync('sqlite3', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return json ? JSON.parse(result.stdout || '[]') : result.stdout;
}

function init() {
  execSql(`CREATE TABLE IF NOT EXISTS src_user_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    field_key TEXT,
    data_type TEXT,
    field_type TEXT
  );`);

  execSql(`CREATE TABLE IF NOT EXISTS trg_user_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    field_key TEXT,
    data_type TEXT,
    field_type TEXT
  );`);

  execSql(`CREATE TABLE IF NOT EXISTS src_user_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_values TEXT,
    option_key TEXT,
    parent_key TEXT
  );`);

  execSql(`CREATE TABLE IF NOT EXISTS trg_user_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_values TEXT,
    option_key TEXT,
    parent_key TEXT
  );`);

  execSql(`CREATE TABLE IF NOT EXISTS mapping_user_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    src_field_key TEXT,
    trg_field_key TEXT
  );`);

  execSql(`CREATE TABLE IF NOT EXISTS mapping_user_fields_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    src_value_key TEXT,
    trg_value_key TEXT,
    src_field TEXT,
    trg_field TEXT
  );`);
}

module.exports = { execSql, init, DB_FILE };
