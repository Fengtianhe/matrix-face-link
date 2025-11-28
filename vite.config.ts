import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // React项目示例

export default defineConfig({
  plugins: [react()],
  base: './'
})