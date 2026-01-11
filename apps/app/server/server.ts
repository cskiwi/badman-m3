import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import { getServer } from '@apps/shared';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import bootstrap from '../src/main.server';
import { ConfigService } from '@nestjs/config';
import { NAVIGATOR } from '@app/frontend-utils';
import cookieParser from 'cookie-parser';
import { REQUEST } from '@angular/core';

// The Express app is exported so that it can be used by serverless Functions.
export async function app() {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Add cookie parser middleware
  server.use(cookieParser());

  // Serve static files from /browser
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
    }),
  );

  // All regular routes use the Angular engine for rendering
  // except for /api/** routes
  server.use(async (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    if (shouldSkip(req.originalUrl)) {
      // Handle API routes separately
      next();
    } else {
      try {
        const userAgent = req.headers['user-agent'];
        const html = await commonEngine.render({
          bootstrap,
          documentFilePath: indexHtml,
          url: `${protocol}://${headers.host}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [
            { provide: APP_BASE_HREF, useValue: baseUrl },
            {
              provide: REQUEST,
              useValue: {
                headers: {
                  get: (name: string) => {
                    if (name.toLowerCase() === 'cookie') {
                      return req.headers.cookie || '';
                    }
                    return req.headers[name.toLowerCase()];
                  },
                },
              },
            },
            { provide: 'RESPONSE', useValue: res },
            { provide: NAVIGATOR, useValue: userAgent },
          ],
        });
        res.send(html);
      } catch (err) {
        next(err);
      }
    }
  });

  // setup NestJS app
  const adapter = new ExpressAdapter(server);
  const app = await getServer(adapter);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);

  await app.init();
  await app.listen(port);
}

async function run(): Promise<void> {
  await app();
}

function shouldSkip(url: string) {
  if (url.startsWith('/api') || url.startsWith('/graphql') || url.startsWith('/.well-known')) {
    return true;
  }
  return false;
}

run();
