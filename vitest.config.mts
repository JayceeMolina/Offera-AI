import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*": ["./*"] path mapping in tsconfig.json.
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // Everything under test is pure logic — no DOM, no React rendering — so the
    // node environment is correct and avoids pulling in jsdom.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // Deliberately not enabling `globals`. Tests import describe/it/expect
    // explicitly, which keeps tsconfig unchanged and avoids polluting the global
    // type space for application code.
    globals: false,
  },
})
