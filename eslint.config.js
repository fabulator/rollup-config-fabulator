import fabulator from 'eslint-config-fabulator';

export default [
  {
    ignores: [
      'node_modules/',
      'package-lock.json',
      'CHANGELOG.md',
      'test/fixtures/',
    ],
  },
  ...fabulator,
];
