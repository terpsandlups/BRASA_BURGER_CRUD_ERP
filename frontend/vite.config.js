import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'apresentacao-local',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (/^\/apresentacao\/?(?:\?|$)/.test(req.url || '')) req.url=req.url.replace(/^\/apresentacao\/?/,'/apresentacao/index.html')
        next()
      })
    },
  }],
})
