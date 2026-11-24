import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { rollup } from 'rollup';
import { getConfig, getDevelopConfig } from '../src/index.js';

const fixtures = path.join(import.meta.dirname, 'fixtures');

async function build(fixture, options) {
  process.chdir(path.join(fixtures, fixture));

  const { output, ...input } = getConfig('./src/index.ts', {}, options);
  const warnings = [];
  const bundle = await rollup({
    ...input,
    onwarn: (warning) => warnings.push(warning),
  });

  try {
    const results = await Promise.all(
      output.map((outputOptions) => bundle.generate(outputOptions)),
    );

    return results.map((result) => ({
      warnings,
      files: Object.fromEntries(
        result.output.map((chunk) => [chunk.fileName, chunk.code]),
      ),
      imports: result.output.flatMap((chunk) => chunk.imports),
    }));
  } finally {
    await bundle.close();
  }
}

test('library build does not inject core-js polyfills', async () => {
  const outputs = await build('library');

  assert.equal(outputs.length, 2, 'outputs CommonJS and ES modules');

  for (const { files, imports, warnings } of outputs) {
    assert.deepEqual(
      warnings.filter(({ exporter }) => exporter?.startsWith('core-js')),
      [],
      'Babel does not inject core-js imports',
    );
    assert.deepEqual(
      Object.keys(files).toSorted(),
      ['double.js', 'index.js'],
      'preserves modules',
    );
    assert.ok(
      !imports.some((id) => id.startsWith('core-js')),
      `no core-js import, got ${imports.join(', ')}`,
    );
    assert.ok(
      imports.some((id) => id.startsWith('@babel/runtime/helpers')),
      'Babel helpers come from @babel/runtime',
    );
    assert.doesNotMatch(
      files['index.js'],
      /: number/,
      'TypeScript is compiled',
    );
  }
});

test('library build with polyfills fails when core-js is not a dependency', async () => {
  await assert.rejects(
    build('library', { polyfills: true }),
    /missing in dependencies[\s\S]*core-js/,
  );
});

test('library build with polyfills imports core-js declared in dependencies', async () => {
  const outputs = await build('library-polyfills', { polyfills: true });

  for (const { imports } of outputs) {
    assert.ok(
      imports.some((id) => id.startsWith('core-js/modules/es.iterator')),
      'core-js polyfills are imported',
    );
  }
});

test('develop build bundles an ES module for the browser', async (t) => {
  process.chdir(path.join(fixtures, 'library'));
  fs.mkdirSync('build', { recursive: true });
  t.after(() => fs.rmSync('build', { recursive: true, force: true }));

  const { output, ...input } = getDevelopConfig('./dev/index.ts');

  assert.ok(
    !input.plugins.some(({ name }) => name === 'serve'),
    'dev server runs only in watch mode',
  );

  const bundle = await rollup({ ...input, onwarn: () => {} });

  try {
    const { output: chunks } = await bundle.generate(output[0]);

    assert.equal(chunks.length, 1, 'bundles into a single file');
    assert.equal(chunks[0].fileName, 'index.js');
    assert.doesNotMatch(
      chunks[0].code,
      /\brequire\(|\bexports\./,
      'no CommonJS',
    );
    assert.match(
      fs.readFileSync('build/index.html', 'utf8'),
      /<script type="module" src="index.js">/,
      'index.html loads the bundle as a module',
    );
  } finally {
    await bundle.close();
  }
});
