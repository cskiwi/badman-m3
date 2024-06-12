import { bootstrapApplication } from '@angular/platform-browser';
import { RootComponent, config } from '@app/frontend-root';
const bootstrap = () => bootstrapApplication(RootComponent, config);

export default bootstrap;
