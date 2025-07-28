const { execSql } = require('./db');

function buildMapping() {
  const fieldRows = execSql(
    `SELECT m.src_field_key, m.trg_field_key, s.field_type
     FROM mapping_user_fields m
     LEFT JOIN src_user_fields s ON m.src_field_key = s.field_key`,
    true
  );

  const field_map = {};
  const custom_field = {};
  fieldRows.forEach(r => {
    if (r.field_type && r.field_type.toLowerCase() === 'custom') {
      custom_field[r.src_field_key] = r.trg_field_key;
    } else {
      field_map[r.src_field_key] = r.trg_field_key;
    }
  });
  if (Object.keys(custom_field).length) {
    field_map.custom_field = custom_field;
  }

  const optionRows = execSql(
    'SELECT src_value_key, trg_value_key, src_field, trg_field FROM mapping_user_fields_options',
    true
  );

  const translation_map = {};
  optionRows.forEach(r => {
    if (!translation_map[r.src_field]) {
      translation_map[r.src_field] = { destination_id: r.trg_field };
    }
    translation_map[r.src_field][r.src_value_key] = r.trg_value_key;
  });

  return { user: { field_map, translation_map } };
}

module.exports = { buildMapping };
