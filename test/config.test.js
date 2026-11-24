import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { rollup } from 'rollup';
import { getConfig } from '../src/index.js';

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
