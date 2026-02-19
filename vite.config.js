import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://my-chat-app-nod.duckdns.org",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "https://my-chat-app-nod.duckdns.org",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  define: {
    global: 'window',
  },
})
