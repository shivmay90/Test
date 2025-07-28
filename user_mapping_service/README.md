# User Mapping Service

This directory contains a Node.js Express application that demonstrates CRUD endpoints using an in-memory SQLite database.

## Setup

The project depends on several Node packages listed in `package.json`. In environments without internet access these packages cannot be installed, so running the application may fail.

To install dependencies and start the server (when possible):

```bash
npm install
npm start
```

The service will listen on port `3000` by default and exposes Swagger documentation at `/api-docs`.
