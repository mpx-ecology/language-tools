import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@mpxjs/language-core',
        replacement: fromRoot('./packages/language-core/src/index.ts'),
      },
      {
        find: '@mpxjs/language-shared',
        replacement: fromRoot('./packages/language-shared/src/index.ts'),
      },
      {
        find: '@mpxjs/typescript-plugin',
        replacement: fromRoot('./packages/typescript-plugin/src/index.ts'),
      },
    ],
  },
  test: {
    clearMocks: true,
    environment: 'node',
    fileParallelism: false,
    include: ['packages/*/__tests__/**/*.spec.ts'],
    pool: 'forks',
    restoreMocks: true,
    testTimeout: 15_000,
  },
})
