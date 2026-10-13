import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = process.env.API_URL || 'http://localhost:4000';

// When the API isn't up yet (or isn't running), answer 503 with a clear message
// instead of dumping an ECONNREFUSED stack trace for every request.
let warned = 0;
const proxyTarget = {
  target: api,
  configure(proxy) {
    proxy.removeAllListeners('error');
    proxy.on('error', (err, _req, res) => {
      if (Date.now() - warned > 10_000) {
        warned = Date.now();
        console.warn(`[proxy] API not reachable at ${api} (${err.code || err.message}). Start it with "npm run dev" from the squaddesk folder.`);
      }
      if (res && !res.headersSent && typeof res.writeHead === 'function') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'The SquadDesk API is not running. Start it and this page will reconnect.' }));
      }
    });
  },
};

// Vite also logs its own stack trace per failed proxy request; our one-line warning replaces it.
const logger = createLogger();
const logError = logger.error;
logger.error = (msg, opts) => {
  if (String(msg).includes('http proxy error')) return;
  logError(msg, opts);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    host: true, // reachable from phones on the same Wi-Fi for QR testing
    proxy: { '/api': proxyTarget, '/q/': proxyTarget },
  },
});
