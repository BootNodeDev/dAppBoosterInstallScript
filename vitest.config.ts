import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['source/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['source/**/*.ts', 'source/**/*.tsx'],
      exclude: ['source/__tests__/**', 'source/components/**'],
    },
  },
})
