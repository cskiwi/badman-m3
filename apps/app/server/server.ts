import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import { getServer } from '@app/backend-root';
import { ExpressAdapter } from '@nestjs/platform-express';
import { CacheHandler } from '@rx-angular/isr/models';
import { ISRHandler } from '@rx-angular/isr/server';
import express from 'express';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import bootstrap from '../src/main.server';
import { FileSystemCacheHandler } from './filesystem-cache-handler';
import { RedisCacheHandler } from './redis-cache-handler';

// The Express app is exported so that it can be used by serverless Functions.
export async function app() {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const isProduction = process.env['NODE_ENV'] === 'production';
  const revalidateToken =
    process.env['REVALIDATE_SECRET_TOKEN'] || 'secret-token';

  const commonEngine = new CommonEngine();

  let cacheHandler: CacheHandler | null = null;

  if (process.env['REDIS_HOST'] && process.env['REDIS_PORT']) {
    cacheHandler = new RedisCacheHandler({
      host: process.env['REDIS_HOST'],
      port: parseInt(process.env['REDIS_PORT']),
      db: parseInt(`${process.env['REDIS_ISR_DB'] ?? '0'}`),
    });
  } else {
    const cacheFolderPath =
      process.env['CACHE_LOCATION'] ?? join(serverDistFolder, '/cache');
    cacheHandler = new FileSystemCacheHandler({
      cacheFolderPath,
      prerenderedPagesPath: serverDistFolder,
      addPrerenderedPagesToCache: true,
    });
  }

  console.log('enable logging', !isProduction);

  const isr = new ISRHandler({
    indexHtml,
    invalidateSecretToken: revalidateToken,
    enableLogging: !isProduction,
    serverDistFolder,
    browserDistFolder,
    bootstrap,
    commonEngine,
    cache: cacheHandler,
  });

  server.use(express.json());
  server.post(
    '/api/invalidate',
    async (req, res) => await isr.invalidate(req, res),
  );

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });

  // Serve static files from /browser
  server.get(
    '**',
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: 'index.html',
    }),
  );

  server.get(
    '*',
    // Serve page if it exists in cache
    async (req, res, next) => {
      if (shouldSkip(req.originalUrl)) {
        // Handle API routes separately
        next();
      } else {
        return await isr.serveFromCache(req, res, next);
      }
    },
    // Server side render the page and add to cache if needed
    async (req, res, next) => {
      if (shouldSkip(req.originalUrl)) {
        // Handle API routes separately
        next();
      } else {
        return await isr.render(req, res, next);
      }
    },
  );

  // All regular routes use the Angular engine for rendering
  // except for /api/** routes
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    if (shouldSkip(req.originalUrl)) {
      // Handle API routes separately
      next();
    } else {
      commonEngine
        .render({
          bootstrap,
          documentFilePath: indexHtml,
          url: `${protocol}://${headers.host}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
        })
        .then((html) => res.send(html))
        .catch((err) => next(err));
    }
  });

  // setup NestJS app
  const adapter = new ExpressAdapter(server);
  const app = await getServer(adapter);

  await app.init();

  return server;
}

async function run(): Promise<void> {
  const port = process.env['PORT'] || 5000;

  // Start up the Node server
  const server = await app();
  server.listen(port);
}

function shouldSkip(url: string) {
  if (url === '/api' || url === '/graphql') {
    return true;
  }
  return false;
}

run();
