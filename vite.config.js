import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Mirrors the netlify.toml redirect for local dev, so `npm run dev` behaves
    // the same as the deployed site — see netlify.toml for why this exists.
    proxy: {
      "/storage-proxy": {
        target: "https://firebasestorage.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage-proxy/, ""),
      },
    },
  },
})
