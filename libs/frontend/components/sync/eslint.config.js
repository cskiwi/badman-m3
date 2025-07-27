const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const baseConfig = require('../../../../eslint.config.js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...baseConfig,
  {
    files: [
      'libs/frontend/components/sync/**/*.ts',
      'libs/frontend/components/sync/**/*.tsx',
      'libs/frontend/components/sync/**/*.js',
      'libs/frontend/components/sync/**/*.jsx',
    ],
    rules: {},
  },
  {
    files: [
      'libs/frontend/components/sync/**/*.ts',
      'libs/frontend/components/sync/**/*.tsx',
    ],
    rules: {},
  },
  {
    files: [
      'libs/frontend/components/sync/**/*.js',
      'libs/frontend/components/sync/**/*.jsx',
    ],
    rules: {},
  },
  ...compat
    .config({
      extends: ['plugin:@nx/angular', 'plugin:@angular-eslint/template/process-inline-templates'],
    })
    .map((config) => ({
      ...config,
      files: [
        'libs/frontend/components/sync/**/*.ts',
        'libs/frontend/components/sync/**/*.tsx',
      ],
      rules: {
        ...config.rules,
      },
    })),
  ...compat
    .config({
      extends: ['plugin:@nx/angular-template'],
    })
    .map((config) => ({
      ...config,
      files: ['libs/frontend/components/sync/**/*.html'],
      rules: {
        ...config.rules,
      },
    })),
];