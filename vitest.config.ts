import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const alias = {
  '@': path.resolve(__dirname, '.'),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'lib/**/*.test.ts',
            'app/api/**/*.test.ts',
            'proxy.test.ts',
          ],
          setupFiles: ['./test/setup-node.ts', './test/setup-server-mocks.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['components/**/*.test.tsx'],
          setupFiles: ['./test/setup-components.ts'],
        },
      },
    ],
  },
})
