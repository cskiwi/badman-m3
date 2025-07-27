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
      'libs/frontend/components/tournament-sync/**/*.ts',
      'libs/frontend/components/tournament-sync/**/*.tsx',
      'libs/frontend/components/tournament-sync/**/*.js',
      'libs/frontend/components/tournament-sync/**/*.jsx',
    ],
    rules: {},
  },
  {
    files: [
      'libs/frontend/components/tournament-sync/**/*.ts',
      'libs/frontend/components/tournament-sync/**/*.tsx',
    ],
    rules: {},
  },
  {
    files: [
      'libs/frontend/components/tournament-sync/**/*.js',
      'libs/frontend/components/tournament-sync/**/*.jsx',
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
        'libs/frontend/components/tournament-sync/**/*.ts',
        'libs/frontend/components/tournament-sync/**/*.tsx',
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
      files: ['libs/frontend/components/tournament-sync/**/*.html'],
      rules: {
        ...config.rules,
      },
    })),
];