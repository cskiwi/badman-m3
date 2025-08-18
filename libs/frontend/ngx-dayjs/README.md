# NgxDayjs

Angular library providing pipes and services for dayjs - a lightweight alternative to ngx-moment.

## Features

- 🚀 **Lightweight** - Only 2kB minified + gzipped
- 🔧 **Tree-shakeable** - Import only what you need
- 🌍 **Internationalization** - Full locale support
- ⏱️ **Timezone support** - Built-in timezone handling
- 📦 **Standalone pipes** - Works with Angular standalone components
- 🧪 **Well-tested** - Comprehensive test coverage

## Installation

```bash
npm install @app/ngx-dayjs dayjs
```

## Usage

### Modern Approach (Recommended)

Use the new `provideDayjs()` function with Angular's standalone APIs:

```typescript
// main.ts or app.config.ts
import { provideDayjs } from '@app/ngx-dayjs';

bootstrapApplication(AppComponent, {
  providers: [
    provideDayjs({
      config: {
        defaultLocale: 'en',
        enablePlugins: ['utc', 'timezone', 'relativeTime']
      }
    })
  ]
});
```

Import individual pipes for optimal tree-shaking:

```typescript
import { DayjsFromNowPipe } from '@app/ngx-dayjs/from-now';
import { DayjsFormatPipe } from '@app/ngx-dayjs/fmt';

@Component({
  standalone: true,
  imports: [DayjsFromNowPipe, DayjsFormatPipe],
  template: `
    <p>{{ date | dayjsFormat:'YYYY-MM-DD' }}</p>
    <p>{{ date | dayjsFromNow }}</p>
  `
})
```

### Legacy Module Approach

For existing applications using NgModule:

```typescript
import { NgxDayjsModule } from '@app/ngx-dayjs';

@NgModule({
  imports: [NgxDayjsModule.forRoot()],
  // ...
})
export class AppModule {}
```

> 📋 See [MODERN_USAGE.md](./MODERN_USAGE.md) for detailed migration guide and all available secondary entry points.

### Use pipes in templates

```html
<!-- Basic date formatting -->
<p>{{ date | dayjsDate }}</p>
<p>{{ date | dayjsDate:'YYYY-MM-DD' }}</p>

<!-- Relative time -->
<p>{{ date | dayjsFromNow }}</p>
<p>{{ date | dayjsFromNow:true }}</p> <!-- without suffix -->

<!-- Calendar format -->
<p>{{ date | dayjsCalendar }}</p>

<!-- Date manipulation -->
<p>{{ date | dayjsAdd:7:'days' | dayjsDate }}</p>
<p>{{ date | dayjsSubtract:1:'month' | dayjsDate }}</p>

<!-- Date comparison -->
<p>{{ date1 | dayjsIsBefore:date2 }}</p>
<p>{{ date1 | dayjsIsAfter:date2 }}</p>
<p>{{ date1 | dayjsIsSame:date2:'day' }}</p>

<!-- Timezone operations -->
<p>{{ date | dayjsTimezone:'America/New_York' | dayjsDate }}</p>
<p>{{ date | dayjsUtc | dayjsDate }}</p>
```

### Use services in components

```typescript
import { DayjsService, DayjsLocaleService } from '@app/ngx-dayjs';

@Component({...})
export class MyComponent {
  constructor(
    private dayjs: DayjsService,
    private locale: DayjsLocaleService
  ) {}

  formatDate(date: string) {
    const parsed = this.dayjs.parse(date);
    return this.dayjs.format(parsed, 'YYYY-MM-DD');
  }

  changeLocale() {
    this.locale.setLocale('fr');
  }
}
```

## Available Pipes

| Pipe | Description | Example |
|------|-------------|---------|
| `dayjsDate` | Format date | `{{ date \| dayjsDate:'YYYY-MM-DD' }}` |
| `dayjsFromNow` | Relative time | `{{ date \| dayjsFromNow }}` |
| `dayjsCalendar` | Calendar format | `{{ date \| dayjsCalendar }}` |
| `dayjsFormat` | Custom format | `{{ date \| dayjsFormat:'DD/MM/YYYY' }}` |
| `dayjsDiff` | Date difference | `{{ date1 \| dayjsDiff:date2:'days' }}` |
| `dayjsAdd` | Add time | `{{ date \| dayjsAdd:7:'days' }}` |
| `dayjsSubtract` | Subtract time | `{{ date \| dayjsSubtract:1:'month' }}` |
| `dayjsStartOf` | Start of period | `{{ date \| dayjsStartOf:'day' }}` |
| `dayjsEndOf` | End of period | `{{ date \| dayjsEndOf:'month' }}` |
| `dayjsTimezone` | Convert timezone | `{{ date \| dayjsTimezone:'UTC' }}` |
| `dayjsUtc` | Convert to UTC | `{{ date \| dayjsUtc }}` |
| `dayjsLocal` | Convert to local | `{{ date \| dayjsLocal }}` |
| `dayjsIsValid` | Validate date | `{{ date \| dayjsIsValid }}` |
| `dayjsIsBefore` | Compare before | `{{ date1 \| dayjsIsBefore:date2 }}` |
| `dayjsIsAfter` | Compare after | `{{ date1 \| dayjsIsAfter:date2 }}` |
| `dayjsIsSame` | Compare equal | `{{ date1 \| dayjsIsSame:date2:'day' }}` |

## Configuration

```typescript
NgxDayjsModule.forRoot({
  defaultLocale: 'en',
  enablePlugins: ['utc', 'timezone', 'relativeTime', 'calendar']
})
```

## Locale Support

```typescript
import { DayjsLocaleService } from '@app/ngx-dayjs';

// Set locale globally
this.localeService.setLocale('fr');

// Load and set locale dynamically
await this.localeService.loadAndSetLocale('ja');

// Listen to locale changes
this.localeService.localeChange$.subscribe(locale => {
  console.log('Locale changed to:', locale);
});
```

## Timezone Support

```typescript
import { DayjsService } from '@app/ngx-dayjs';

// Convert to specific timezone
const nyTime = this.dayjs.tz(date, 'America/New_York');

// Convert to UTC
const utcTime = this.dayjs.utc(date);

// Convert back to local
const localTime = this.dayjs.local(utcTime);
```

## Comparison with ngx-moment

| Feature | ngx-dayjs | ngx-moment |
|---------|-----------|------------|
| Bundle size | ~2kB | ~67kB |
| Tree-shaking | ✅ | ❌ |
| Immutable | ✅ | ❌ |
| Timezone support | ✅ | ✅ |
| Plugin system | ✅ | ✅ |
| API similarity | High | Moment.js |

## Testing

Run `nx test ngx-dayjs` to execute the unit tests.

## License

MIT
