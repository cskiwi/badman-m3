const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const baseConfig = require('../../../../eslint.config.js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...baseConfig,
  ...compat
    .config({
      extends: ['plugin:@nx/angular', 'plugin:@angular-eslint/template/process-inline-templates'],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts'],
      rules: {
        ...config.rules,
        '@angular-eslint/directive-selector': [
          'error',
          {
            type: 'attribute',
            prefix: 'app',
            style: 'camelCase',
          },
        ],
        '@angular-eslint/component-selector': [
          'error',
          {
            type: 'element',
            prefix: 'app',
            style: 'kebab-case',
          },
        ],
      },
    })),
  ...compat
    .config({
      extends: ['plugin:@nx/angular-template'],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.html'],
      rules: {
        ...config.rules,
      },
    })),
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredDependencies: [
            '@angular/core',
            'primeng',
            '@ngx-translate/core',
            '@angular/common'
          ],
        },
      ],
    },
    languageOptions: {
      parser: require('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/prefer-standalone': 'off',
    },
  },
];
