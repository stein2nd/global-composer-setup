import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/cli/main.ts',
      formats: ['cjs'],
      fileName: () => 'global-composer.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node18',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [/^node:/, 'child_process', 'fs', 'os', 'path', 'process', 'url', 'util'],
      output: {
        exports: 'auto',
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    {
      name: 'shebang',
      generateBundle(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type === 'chunk' && file.isEntry) {
            file.code = `#!/usr/bin/env node\n${file.code}`;
          }
        }
      },
    },
  ],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
