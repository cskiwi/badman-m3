const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

console.log(`Building server... ${process.env.NODE_ENV}`);

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      outputHashing: process.env['NODE_ENV'] === 'production' ? 'all' : 'none',
      optimization: process.env['NODE_ENV'] === 'production',
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
