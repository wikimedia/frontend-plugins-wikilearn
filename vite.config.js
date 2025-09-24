import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// library build
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.jsx',   // your public API
      name: 'frontend-plugins-wikilearn',
      fileName: (format) => `frontend-plugins-wikilearn.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})