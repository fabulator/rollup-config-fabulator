import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

function getPackageName(id) {
  const parts = id.split('/');

  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function readDeclaredDependencies() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
}

/**
 * Fails the build when the output imports a package that is not declared in dependencies,
 * peerDependencies or optionalDependencies of the built library, e.g. core-js injected
 * by babel-plugin-polyfill-corejs3 or @babel/runtime injected by @babel/plugin-transform-runtime.
 */
export function checkDependencies() {
  return {
    name: 'fabulator-check-dependencies',
    generateBundle(_options, bundle) {
      const declared = readDeclaredDependencies();
      const missing = new Map();

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') {
          continue;
        }

        for (const id of [...chunk.imports, ...chunk.dynamicImports]) {
          if (
            id in bundle ||
            id.startsWith('.') ||
            path.isAbsolute(id) ||
            isBuiltin(id)
          ) {
            continue;
          }

          const name = getPackageName(id);

          if (!declared.has(name)) {
            missing.set(name, [...(missing.get(name) ?? []), chunk.fileName]);
          }
        }
      }

      if (missing.size > 0) {
        const list = [...missing].map(
          ([name, files]) =>
            `  - ${name} (imported by ${[...new Set(files)].join(', ')})`,
        );

        this.error(
          `Build output imports packages missing in dependencies/peerDependencies of package.json:\n${list.join('\n')}\n` +
            'Add them to package.json, or disable code that injects them (e.g. polyfills).',
        );
      }
    },
  };
}
