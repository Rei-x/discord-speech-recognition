import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 20000,
    include: ['tests/**/*.test.ts'],
  },
})
