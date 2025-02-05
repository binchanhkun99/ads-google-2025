import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './', // Để Electron có thể đọc đúng file build
  build: {
    outDir: 'dist', // Đảm bảo thư mục build trùng với Electron
  },
});
