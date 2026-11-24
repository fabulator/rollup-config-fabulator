# Fabulator Default Rollup Configuration

Rollup configuration for Fabulator's JavaScript and TypeScript libraries.

## Usage

```bash
npm install --save-dev rollup-config-fabulator babel-config-fabulator
```

`rollup.config.mjs` (Rollup 4 loads `.js` configs as CommonJS unless the package has `"type": "module"`):

```js
import { getConfig } from 'rollup-config-fabulator';

export default getConfig('./src/index.ts');
```

- Outputs CommonJS to `dist` and ES modules to `es`, one file per source module.
- Source is compiled with the project's Babel config (`@babel/core` 8 is a peer dependency).
- Bare imports resolve from `src`, packages from `node_modules` stay external.

### Polyfills

`babel-config-fabulator` injects `core-js` polyfills, which is right for applications but not for libraries –
the library would then require `core-js`. `getConfig` therefore disables `babel-plugin-polyfill-corejs3` by default.

To ship polyfills, enable them and add `core-js` to the library's `dependencies`:

```js
export default getConfig('./src/index.ts', {}, { polyfills: true });
```

### Dependency check

The build fails when the output imports a package that is not in `dependencies`, `peerDependencies`
or `optionalDependencies` of the library (e.g. `@babel/runtime` helpers or `core-js` polyfills).

## Development build

`getDevelopConfig('./dev/index.tsx')` bundles everything including dependencies into a single ES module in `build`,
loaded by `build/index.html` via `<script type="module">`. In watch mode (`rollup -c -w`) it also serves `build` on port 8080.
