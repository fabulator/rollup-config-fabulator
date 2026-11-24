import fs from 'node:fs';
import path from 'node:path';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import serve from 'rollup-plugin-serve';
import { babel } from './babel.js';
import { checkDependencies } from './check-dependencies.js';

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * Rollup config for libraries. Outputs CommonJS to `dist` and ES modules to `es`, dependencies stay external.
 *
 * @param {string} file entry file, e.g. `./src/index.ts`
 * @param {object} [settings] Rollup options merged over the defaults
 * @param {object} [options]
 * @param {boolean} [options.polyfills=false] keep core-js polyfills injected by the Babel config,
 *   the library then has to list `core-js` in its dependencies
 */
export function getConfig(file, settings = {}, { polyfills = false } = {}) {
  const destinationDir = path.parse(file.replace('src', 'dist')).dir;
  const destinationEs = path.parse(file.replace('src', 'es')).dir;

  return {
    treeshake: {
      propertyReadSideEffects: false,
      // external imports are side-effect free, except core-js polyfills (`import 'core-js/modules/…'`)
      // which would be silently dropped
      moduleSideEffects: (id, external) =>
        !external || (polyfills && /^core-js(\/|$)/.test(id)),
    },
    input: file,
    output: [
      {
        dir: destinationDir,
        format: 'cjs',
        freeze: false,
        preserveModules: true,
      },
      {
        dir: destinationEs,
        format: 'es',
        freeze: false,
        preserveModules: true,
      },
    ],
    plugins: [
      babel({
        extensions: supportedExtensions,
        polyfills,
      }),
      resolve({
        modulesOnly: true,
        // bare imports resolve from `src`, packages from node_modules stay external
        moduleDirectories: ['src'],
        extensions: supportedExtensions,
      }),
      json(),
      checkDependencies(),
    ],
    ...settings,
  };
}

/**
 * Rollup config for a development build with a dev server on port 8080. Bundles dependencies.
 *
 * @param {string} file entry file
 */
export function getDevelopConfig(file) {
  const base = getConfig(file);
  const destinationFile = file
    .replace(/dev/, '/build/')
    .replace(/\.(tsx|ts)$/, '.js');

  fs.copyFileSync(
    path.resolve(import.meta.dirname, '..', 'assets', 'index.html'),
    path.resolve(path.parse(destinationFile).dir, 'index.html'),
  );

  return {
    ...base,
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
      }),
      commonjs({
        include: /node_modules/,
      }),
      resolve({
        browser: true,
        extensions: supportedExtensions,
      }),
      babel({
        extensions: supportedExtensions,
      }),
      serve({
        contentBase: 'build',
        port: 8080,
      }),
    ],
    output: [
      {
        file: destinationFile,
        format: 'cjs',
        freeze: false,
      },
    ],
  };
}
