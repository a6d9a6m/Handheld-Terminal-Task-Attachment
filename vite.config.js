// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteMockServe } from 'vite-plugin-mock';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [
    vue(),
    viteMockServe({
      mockPath: 'mock',
      localEnabled: true,
      supportTs: false,
    }),
  ],
  resolve: {
    alias: {
      'src': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://192.168.2.57', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/prod-api'),
      },

      '/webrtc-api': {
        target: 'http://192.168.2.57',
        changeOrigin: true,
      },

      '/easy-api': {
        target: 'http://192.168.2.57',
        changeOrigin: true,
      }

    }
  },
  assetsInclude: ['**/*.wasm'],  // 添加对wasm文件的支持
  optimizeDeps: {
    exclude: ['@easydarwin/easyplayer'] // 排除EasyPlayer依赖以避免预构建问题
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/view/**/*.{js,vue}',
        'src/api/**/*.js',
        'src/utils/**/*.js'
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/main.js',
        'src/router/**',
        'mock/**',
      ],
    }
  }
});