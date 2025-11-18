import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5060,
    host: '0.0.0.0'
  },
  plugins: [
    build({
      outputDir: 'dist',
      // Configure _routes.json to only route API requests through worker
      routes: {
        include: ['/api/*'],
        exclude: ['/static/*', '/', '/index.html']
      }
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
