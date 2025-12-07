import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { ShellComponent } from '@app/frontend-components/shell';
import { config } from '../config';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(ShellComponent, config, context);

export default bootstrap;
