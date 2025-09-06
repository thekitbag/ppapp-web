import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  build: {
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          // Fix cookie domain/path quirks for local development
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers['set-cookie']
            if (Array.isArray(setCookie)) {
              proxyRes.headers['set-cookie'] = setCookie.map((c) =>
                c
                  .replace(/; *Secure/gi, '')     // Remove Secure flag for http
                  .replace(/; *SameSite=None/gi, '; SameSite=Lax') // Use Lax for local
              )
            }
          })
        },
      },
    }
  },
})