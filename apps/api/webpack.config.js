const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
  },
  optimization: isProd
    ? {
        minimize: true,
        minimizer: [
          new (require('terser-webpack-plugin'))({
            terserOptions: {
              keep_classnames: true,
              keep_fnames: true,
            },
          }),
        ],
      }
    : undefined,
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: isProd ? 'all' : 'none',
      generatePackageJson: true,
      assets: [
        // './src/assets',
        {
          glob: '**/*',
          input: 'libs/backend/translate/assets',
          output: 'assets',
        },
      ],
    }),
  ],
};
