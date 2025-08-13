import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss({
      content: [
        './src/**/*.{js,ts,jsx,tsx}',
        './node_modules/@rafal.lemieszewski/tide-ui/**/*.{js,ts,jsx,tsx}'
      ],
    }),
  ],
})
