import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function swBuildPlugin() {
  return {
    name: 'sw-build-plugin',
    closeBundle() {
      const swDistPath = path.resolve(__dirname, 'dist/sw.js')
      if (fs.existsSync(swDistPath)) {
        let content = fs.readFileSync(swDistPath, 'utf-8')
        const buildId = Date.now().toString()
        content = content.replace(/__BUILD_TIMESTAMP__/g, buildId)
        fs.writeFileSync(swDistPath, content, 'utf-8')
        console.log(`[SW Plugin] Injected build timestamp cache key: wellmora-cache-${buildId}`)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), swBuildPlugin()],
})

