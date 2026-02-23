import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // No manual define needed — Vite loads VITE_* vars from .env files automatically.
  // For iOS builds use: VITE_API_URL=http://<your-mac-ip>:3000 npm run build
});
