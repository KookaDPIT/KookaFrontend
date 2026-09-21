import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /* Flags are the exception to Vite's "small file, inline it" rule. Each of
       the ~250 SVGs in country-flag-icons is under the 4 kB threshold, so by
       default every one of them was base64'd into the main bundle — a megabyte
       of drawings nobody's page shows more than a handful of. Kept as files,
       the bundle carries only their URLs and the browser fetches the few flags
       actually on screen. */
    assetsInlineLimit: (filePath) => (
      filePath.includes('country-flag-icons') ? false : undefined
    ),
  },
})
