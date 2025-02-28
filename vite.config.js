import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './', // Đảm bảo đường dẫn tương đối cho Electron
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist', // Thư mục build
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách chunk để kiểm tra tải tài nguyên
          'appeal': ['src/views/Appeal.vue'],
          'campaigns': ['src/campaigns/index.vue'],
        },
      },
    },
  },
});
