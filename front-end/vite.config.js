import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/q1': 'http://localhost:8000',
      '/q2': 'http://localhost:8000',
      '/q3': 'http://localhost:8000',
      '/q4': 'http://localhost:8000',
      '/q5': 'http://localhost:8000',
      '/q6': 'http://localhost:8000',
      '/q7': 'http://localhost:8000',
      '/q8': 'http://localhost:8000',
    }
  }
})
