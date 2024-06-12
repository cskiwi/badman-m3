import { bootstrapApplication } from '@angular/platform-browser';
import { RootComponent, appConfig } from '@app/frontend-root';

bootstrapApplication(RootComponent, appConfig).catch((err) =>
  console.error(err)
);
