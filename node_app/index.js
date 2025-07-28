const http = require('http');
const { init } = require('./db');
const { buildMapping } = require('./mappingService');

init();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/mapping') {
    try {
      const data = buildMapping();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
