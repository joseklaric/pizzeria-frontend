import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // Intento de excluir explícitamente vite-plugin-vue-inspector
    // Esto es una medida de precaución si se carga de forma inesperada
    {
      name: 'exclude-vue-inspector',
      configResolved(config) {
        const inspectorPluginIndex = config.plugins.findIndex(
          (plugin) => plugin.name === 'vite-plugin-vue-inspector'
        );
        if (inspectorPluginIndex !== -1) {
          config.plugins.splice(inspectorPluginIndex, 1);
          console.warn('vite-plugin-vue-inspector fue excluido explícitamente.');
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})
