import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.relayer_key'],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      minify: 'esbuild',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
                return 'vendor-pdf';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('viem')) {
                return 'vendor-web3';
              }
              if (id.includes('motion')) {
                return 'vendor-animation';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
  };
});
