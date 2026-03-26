import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = process.env.PORT || 3000;
const DIST = new URL('./dist/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const API_URL = process.env.API_URL || '';

createServer(async (req, res) => {
  // Proxy /api requests to backend
  if (req.url.startsWith('/api') && API_URL) {
    try {
      const target = `${API_URL}${req.url}`;
      const headers = { ...req.headers, host: new URL(API_URL).host };
      const proxyRes = await fetch(target, {
        method: req.method,
        headers,
        body: ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? await new Promise((resolve) => {
              const chunks = [];
              req.on('data', c => chunks.push(c));
              req.on('end', () => resolve(Buffer.concat(chunks)));
            })
          : undefined,
      });
      res.writeHead(proxyRes.status, {
        'Content-Type': proxyRes.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      const body = await proxyRes.arrayBuffer();
      res.end(Buffer.from(body));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    }
    return;
  }

  let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // SPA fallback
    const html = await readFile(join(DIST, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}).listen(PORT, () => console.log(`Serving on :${PORT}`));
