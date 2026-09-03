import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Đường dẫn tương đối để bản build chạy được ở bất kỳ thư mục nào,
  // kể cả khi mở trực tiếp bằng file:// hoặc đặt trong subfolder của hosting.
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
