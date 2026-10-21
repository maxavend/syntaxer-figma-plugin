import { renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const outDir = resolve(import.meta.dirname, 'dist');

// Figma loads the UI from a single HTML file: inline everything and emit dist/ui.html
export default defineConfig({
  root: resolve(import.meta.dirname, 'ui'),
  plugins: [
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: 'rename-to-ui-html',
      closeBundle() {
        renameSync(resolve(outDir, 'index.html'), resolve(outDir, 'ui.html'));
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2020',
  },
});
