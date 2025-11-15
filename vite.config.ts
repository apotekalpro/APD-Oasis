import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      outputDir: 'dist',
      // Configure _routes.json to exclude static assets
      routes: {
        exclude: ['/static/*', '/favicon.ico', '/index.html']
      }
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
