import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/client',
  // Preact's JSX: https://preactjs.com/guide/v10/getting-started#integrating-into-an-existing-pipeline
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
