import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'


export default defineConfig({
  plugins: [vue()],
  base: './', // Để Electron có thể đọc đúng file build
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src') // Thay thế "~" bằng "src"
    }
  },
  build: {
    outDir: 'dist', // Đảm bảo thư mục build trùng với Electron
  },
});
