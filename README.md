# Node.js Mapping App

This simple Node.js application provides a backend service that uses an SQLite database. The database contains tables for user field mappings and option mappings. The service exposes an HTTP endpoint to return a JSON structure derived from the mapping tables.

## Setup

No external Node packages are required. The application relies on the `sqlite3` command line tool that is available in the environment.

1. Navigate to `node_app` directory:
   ```bash
   cd node_app
   ```
2. Start the server:
   ```bash
   node index.js
   ```
   The server listens on port `3000` by default.

## Endpoint

- `GET /mapping` – Returns a JSON payload with the field map and translation map derived from the database tables.

## Database

On startup the application creates the following tables in `database.sqlite` if they do not already exist:

- `src_user_fields`
- `trg_user_fields`
- `src_user_options`
- `trg_user_options`
- `mapping_user_fields`
- `mapping_user_fields_options`

You can populate these tables using the `sqlite3` command line or any SQLite tool. The `/mapping` endpoint builds JSON based on the data in `mapping_user_fields` and `mapping_user_fields_options`.

