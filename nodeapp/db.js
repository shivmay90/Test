const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function insert(table, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  return run(sql, values).then(result => result.lastID);
}

function update(table, id, data, idField = 'id') {
  const keys = Object.keys(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  const sql = `UPDATE ${table} SET ${assignments} WHERE ${idField} = ?`;
  return run(sql, [...values, id]);
}

function remove(table, id, idField = 'id') {
  const sql = `DELETE FROM ${table} WHERE ${idField} = ?`;
  return run(sql, [id]);
}

module.exports = {
  db,
  run,
  get,
  all,
  insert,
  update,
  remove
};
