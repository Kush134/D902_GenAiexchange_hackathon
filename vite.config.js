import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

dotenv.config();

export default defineConfig(({ command }) => {
  return {
    root: 'src',
    base: '/projects/ajourneywithkush/',
    build: {
      outDir: '../dist',
    },
    preview: {
      port: 8080,
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.GOOGLE_MAPS_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY),
    },
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
