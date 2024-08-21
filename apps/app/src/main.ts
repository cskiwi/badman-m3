import { bootstrapApplication } from '@angular/platform-browser';
import { ShellComponent } from '@app/frontend-components/shell';
import { appConfig } from '../config';

bootstrapApplication(ShellComponent, appConfig).catch((err) =>
  console.error(err)
);
