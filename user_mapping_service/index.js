const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const ExcelJS = require('exceljs');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// SQLite in-memory database
const db = new sqlite3.Database(':memory:');

// Create tables
const initQueries = [
`CREATE TABLE IF NOT EXISTS src_user_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, field_key TEXT UNIQUE NOT NULL, data_type TEXT, field_type TEXT)`,
`CREATE TABLE IF NOT EXISTS trg_user_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, field_key TEXT UNIQUE NOT NULL, data_type TEXT, field_type TEXT)`,
`CREATE TABLE IF NOT EXISTS src_user_options (id INTEGER PRIMARY KEY AUTOINCREMENT, option_values TEXT, option_key TEXT UNIQUE NOT NULL, parent_key TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS trg_user_options (id INTEGER PRIMARY KEY AUTOINCREMENT, option_values TEXT, option_key TEXT UNIQUE NOT NULL, parent_key TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS mapping_user_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, src_field_key TEXT, trg_field_key TEXT)`,
`CREATE TABLE IF NOT EXISTS mapping_user_fields_options (id INTEGER PRIMARY KEY AUTOINCREMENT, src_value_key TEXT, trg_value_key TEXT, src_field TEXT, trg_field TEXT)`
];

db.serialize(() => {
  initQueries.forEach(q => db.run(q));
  fetchAll().catch(e => console.error('Failed to fetch user fields', e));
});

async function fetchAndStore(instance, fieldTable, optionTable) {
  const url = instance.url.replace(/\/$/, '') + '/api/v2/user_fields.json';
  const auth = Buffer.from(`${instance.email}/token:${instance.token}`).toString('base64');
  const resp = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const fields = resp.data && resp.data.user_fields ? resp.data.user_fields : [];
  for (const f of fields) {
    const fieldVals = [f.title, f.key, f.type, f.system ? 'system' : 'custom'];
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO ${fieldTable}(name, field_key, data_type, field_type) VALUES (?,?,?,?)`,
        fieldVals,
        err => (err ? reject(err) : resolve())
      );
    });
    const options = f.custom_field_options || f.system_field_options || [];
    for (const opt of options) {
      const vals = [opt.name, opt.value, f.key];
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO ${optionTable}(option_values, option_key, parent_key) VALUES (?,?,?)`,
          vals,
          err => (err ? reject(err) : resolve())
        );
      });
    }
  }
}

async function fetchAll() {
  const src = { url: process.env.SRC_URL, email: process.env.SRC_EMAIL, token: process.env.SRC_TOKEN };
  const trg = { url: process.env.TRG_URL, email: process.env.TRG_EMAIL, token: process.env.TRG_TOKEN };
  if (src.url && src.email && src.token) {
    await fetchAndStore(src, 'src_user_fields', 'src_user_options');
  }
  if (trg.url && trg.email && trg.token) {
    await fetchAndStore(trg, 'trg_user_fields', 'trg_user_options');
  }
}

function checkParent(table, parentKey, value, cb) {
  const userTable = table.startsWith('src') ? 'src_user_fields' : 'trg_user_fields';
  db.get(`SELECT 1 FROM ${userTable} WHERE field_key = ?`, [parentKey], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('Invalid parent_key'));
    cb(null);
  });
}

function crud(table) {
  app.post(`/${table}`, (req, res) => {
    const keys = Object.keys(req.body);
    const vals = keys.map(k => req.body[k]);
    if (table.includes('_options')) {
      const idx = keys.indexOf('parent_key');
      checkParent(table, vals[idx], vals, err => {
        if (err) return res.status(400).json({error: err.message});
        insert();
      });
    } else {
      insert();
    }

    function insert() {
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT INTO ${table}(${keys.join(',')}) VALUES(${placeholders})`;
      db.run(sql, vals, function(err) {
        if (err) return res.status(400).json({error: err.message});
        res.json({id: this.lastID});
      });
    }
  });

  app.get(`/${table}/:id`, (req, res) => {
    db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({error: err.message});
      if (!row) return res.status(404).json({error: 'Not found'});
      res.json(row);
    });
  });

  app.get(`/${table}`, (req, res) => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
      if (err) return res.status(500).json({error: err.message});
      res.json(rows);
    });
  });

  app.put(`/${table}/:id`, (req, res) => {
    const keys = Object.keys(req.body);
    const vals = keys.map(k => req.body[k]);
    if (!keys.length) return res.status(400).json({error: 'No fields'});
    const setStr = keys.map(k => `${k} = ?`).join(',');
    const sql = `UPDATE ${table} SET ${setStr} WHERE id = ?`;
    vals.push(req.params.id);
    db.run(sql, vals, function(err) {
      if (err) return res.status(400).json({error: err.message});
      res.json({changed: this.changes});
    });
  });

  app.delete(`/${table}/:id`, (req, res) => {
    db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id], function(err) {
      if (err) return res.status(500).json({error: err.message});
      res.json({deleted: this.changes});
    });
  });
}

['src_user_fields','trg_user_fields','src_user_options','trg_user_options','mapping_user_fields','mapping_user_fields_options'].forEach(crud);

// Swagger setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'User Mapping Service',
    version: '1.0.0'
  },
};

const options = {
  swaggerDefinition,
  apis: ['./index.js'],
};
const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /src_user_fields:
 *   post:
 *     summary: Create src_user_fields
 */

// Export JSON
app.get('/export/json', (req, res) => {
  const result = { user: { field_map: {}, translation_map: {} } };
  db.all('SELECT * FROM mapping_user_fields', (err, mappings) => {
    if (err) return res.status(500).json({error: err.message});
    const tasks = mappings.map(m => new Promise((resolve, reject) => {
      db.get('SELECT field_type FROM src_user_fields WHERE field_key = ?', [m.src_field_key], (e, row) => {
        if (e) return reject(e);
        if (row && row.field_type === 'custom') {
          if (!result.user.field_map.custom_field) result.user.field_map.custom_field = {};
          result.user.field_map.custom_field[m.src_field_key] = m.trg_field_key;
        } else if (row) {
          result.user.field_map[m.src_field_key] = m.trg_field_key;
        }
        resolve();
      });
    }));

    Promise.all(tasks).then(() => {
      db.all('SELECT * FROM mapping_user_fields_options', (e2, optionsRows) => {
        if (e2) return res.status(500).json({error: e2.message});
        optionsRows.forEach(r => {
          if (!result.user.translation_map[r.src_field]) {
            result.user.translation_map[r.src_field] = { destination_id: r.trg_field };
          }
          result.user.translation_map[r.src_field][r.src_value_key] = r.trg_value_key;
        });
        res.json(result);
      });
    }).catch(er => res.status(500).json({error: er.message}));
  });
});

// Export XLSX
app.get('/export/xlsx', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('user mapping');
  sheet.columns = [
    {header: 'src_field_key', key: 'src_field_key'},
    {header: 'src_name', key: 'src_name'},
    {header: 'src_data_type', key: 'src_data_type'},
    {header: 'trg_field_key', key: 'trg_field_key'},
    {header: 'trg_name', key: 'trg_name'},
    {header: 'trg_data_type', key: 'trg_data_type'},
  ];
  db.all(`SELECT s.field_key as src_field_key, s.name as src_name, s.data_type as src_data_type,
                 t.field_key as trg_field_key, t.name as trg_name, t.data_type as trg_data_type
          FROM mapping_user_fields m
          JOIN src_user_fields s ON m.src_field_key = s.field_key
          JOIN trg_user_fields t ON m.trg_field_key = t.field_key`, async (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    rows.forEach(r => sheet.addRow(r));
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mapping.xlsx"');
    res.send(buffer);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
