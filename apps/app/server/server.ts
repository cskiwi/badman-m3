import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import { getServer } from '@app/backend-shared';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { REQUEST as COOKIE_SERVICE_REQ } from 'ngx-cookie-service-ssr';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import bootstrap from '../src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export async function app() {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files from /browser
  server.get(
    '**',
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: 'index.html',
    }),
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
          providers: [
            { provide: APP_BASE_HREF, useValue: baseUrl },
            { provide: COOKIE_SERVICE_REQ, useValue: req },
            { provide: 'RESPONSE', useValue: res },
          ],
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
  if (url.startsWith('/api') || url.startsWith('/graphql')) {
    return true;
  }
  return false;
}

run();
