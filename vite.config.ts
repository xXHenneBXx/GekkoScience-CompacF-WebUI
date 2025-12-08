import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,       // Allows access from other devices on your LAN
    port: 5173,       // Optional: choose your port
    strictPort: false, // Will try the next available port if 5173 is taken
  },
});
