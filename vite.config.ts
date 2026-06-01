import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Safari iOS refuses to execute <script type="module" crossorigin> when GitHub
// Pages' CDN responds without Access-Control-Allow-Origin on same-origin
// requests — producing a completely blank page. All assets are same-origin
// on GitHub Pages so crossorigin is unnecessary and safe to remove.
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml: (html) => html.replace(/ crossorigin/g, ''),
  }
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    // Target Safari 13 (iOS 13+) to compile away ??, ?., and other
    // ES2020 syntax that older devices don't support natively.
    target: 'safari13',
  },
})
