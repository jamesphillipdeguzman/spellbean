import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { EdgeTTS } from '@andresaya/edge-tts';

function edgeTtsDevPlugin(): Plugin {
  return {
    name: 'edge-tts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/tts')) {
          try {
            const url = new URL(req.url, 'http://localhost');
            const text = url.searchParams.get('text')?.trim() || '';
            const voice = url.searchParams.get('voice')?.trim() || 'en-PH-JamesNeural';
            const rate = url.searchParams.get('rate')?.trim() || '-15%';

            if (!text) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing text parameter' }));
              return;
            }

            const tts = new EdgeTTS();
            const result = await tts.generate(text, voice, { rate });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
            res.end(result.audio);
          } catch (e: any) {
            console.error('Local TTS dev error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), edgeTtsDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'xlsx-vendor': ['xlsx'],
          'react-vendor': ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
});
