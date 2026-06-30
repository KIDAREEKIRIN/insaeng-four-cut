import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// `npm run dev:https` sets HTTPS=true so the camera works on the iPad over LAN.
const useHttps = process.env.HTTPS === 'true'
// GitHub Pages serves at /<repo>/ — the Actions build sets GITHUB_PAGES=true.
const base = process.env.GITHUB_PAGES === 'true' ? '/insaeng-four-cut/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    ...(useHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // the optional AI background-removal model ships a ~24MB wasm — load it
        // from the network on demand instead of precaching it
        globIgnores: ['**/*.wasm', '**/ort*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: '인생네컷',
        short_name: '인생네컷',
        description: '나만의 네컷 사진 부스',
        theme_color: '#1a1714',
        background_color: '#1a1714',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
