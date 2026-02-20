import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从目录名获取项目名（用于 base 路径）
const projectName = __dirname.split('/').pop() || 'unknown';
void projectName;

export default defineConfig({
  server: {
    port: 15173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    host: true,
  },
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
