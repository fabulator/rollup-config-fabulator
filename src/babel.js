import { createRequire } from 'node:module';
import path from 'node:path';
import { transformAsync } from '@babel/core';
import { createFilter } from '@rollup/pluginutils';

const POLYFILL_PLUGIN = 'babel-plugin-polyfill-corejs3';

/**
 * Absolute path of the polyfill plugin exactly as Babel loads it from the project's config.
 * Babel merges plugins by identity (the loaded module), so the path must point to the same file.
 */
function resolvePolyfillPlugin() {
  const projectRequire = createRequire(
    path.join(process.cwd(), 'package.json'),
  );
  const bases = [];

  try {
    // babel-config-fabulator brings the polyfill plugin as its own dependency
    bases.push(createRequire(projectRequire.resolve('babel-config-fabulator')));
  } catch {
    // the project does not use babel-config-fabulator
  }

  bases.push(projectRequire);

  for (const base of bases) {
    try {
      return base.resolve(POLYFILL_PLUGIN);
    } catch {
      // try the next location
    }
  }

  return null;
}

/**
 * Minimal Babel plugin for Rollup.
 *
 * It replaces @rollup/plugin-babel, which still declares a peer dependency on @babel/core 7
 * and therefore cannot be installed next to Babel 8 without --force / overrides.
 */
export function babel({
  extensions,
  exclude = /node_modules/,
  polyfills = true,
}) {
  const filter = createFilter(null, exclude);
  const polyfillPlugin = polyfills ? null : resolvePolyfillPlugin();

  return {
    name: 'fabulator-babel',
    async transform(code, id) {
      if (
        id.startsWith('\0') ||
        !filter(id) ||
        !extensions.includes(path.extname(id))
      ) {
        return null;
      }

      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        caller: {
          name: 'rollup-config-fabulator',
          supportsStaticESM: true,
          supportsDynamicImport: true,
          supportsTopLevelAwait: true,
          supportsExportNamespaceFrom: true,
        },
        // `false` disables the plugin coming from the project's Babel config
        ...(polyfillPlugin ? { plugins: [[polyfillPlugin, false]] } : {}),
      });

      // file ignored by the Babel config
      if (!result) {
        return null;
      }

      return { code: result.code, map: result.map };
    },
  };
}
