const { db } = require('./db');

// Example: create tables if they do not exist
const createUserTable = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
)`;

const createPostsTable = `CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  content TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`;

db.serialize(() => {
  db.run(createUserTable);
  db.run(createPostsTable);
});
