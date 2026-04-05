---
name: angular-development
description: Angular development patterns using PrimeNG components. Use when building Angular features, components, forms, or UI elements in this project.
---

# Angular Development with PrimeNG

Provides project-specific guidance for Angular development in the badman-m3 codebase, integrating PrimeNG components.

## When to Use

- Building new Angular components or features
- Implementing forms with PrimeNG components
- Creating data tables, grids, or complex UI elements
- User asks about PrimeNG components
- Implementing responsive layouts with the project's design system
- Questions about component integration patterns

## Technology Stack

### Angular Framework

- **Angular 20+** with standalone components
- **TypeScript 5.9+** with strict mode
- **RxJS** for reactive programming
- **Signals** for state management

### UI Component Libraries

#### PrimeNG (Primary UI Library)

- **Version**: Latest stable version compatible with Angular 20+
- **Documentation**: https://primeng.org/
- **AI-Optimized Reference**: https://primeng.org/llms/llms.txt
- **MCP Tools**: Use `mcp_primeng_*` tools for component discovery and documentation
- **Theming**: Project-specific theme configuration

### Styling

- **SCSS**: Component-scoped styles
- **CSS Variables**: Design tokens for theming
- **Responsive**: Mobile-first approach

## General Angular Guidelines

### Component Architecture

**Always use standalone components** (Angular 20+):

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [
    /* dependencies */
  ],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss', // singular 'styleUrl'
})
export class ExampleComponent {
  // Component logic
}
```

**Key principles:**

- **Never use NgModules** - use standalone components only
- **Always use external templates** - `templateUrl`, never inline templates
- **Use `styleUrl`** (singular) for single stylesheet, `styleUrls` (plural) for multiple
- **Keep components focused** - single responsibility principle

### Modern Angular Syntax

**Dependency Injection with `inject()`:**

```typescript
import { Component, inject } from '@angular/core';
import { UserService } from './user.service';

@Component({...})
export class UserComponent {
  // Preferred: inject() function
  private readonly userService = inject(UserService);

  // Avoid: constructor injection
  // constructor(private userService: UserService) {}
}
```

**Signals for State Management:**

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({...})
export class CounterComponent {
  // Writable signal
  count = signal(0);

  // Computed signal (derived state)
  doubleCount = computed(() => this.count() * 2);

  // Effect (side effects)
  constructor() {
    effect(() => {
      console.log('Count changed to:', this.count());
    });
  }

  increment(): void {
    this.count.update(value => value + 1);
  }
}
```

**Modern Control Flow Syntax:**

```html
<!-- Use @if, NOT *ngIf -->
@if (user()) {
<p>Welcome, {{ user()!.name }}</p>
} @else {
<p>Please log in</p>
}

<!-- Use @for, NOT *ngFor -->
@for (item of items(); track item.id) {
<li>{{ item.name }}</li>
} @empty {
<li>No items found</li>
}

<!-- Use @switch, NOT *ngSwitch -->
@switch (status()) { @case ('loading') {
<p-progressSpinner />
} @case ('error') {
<p class="error">Error occurred</p>
} @case ('success') {
<div>{{ data() }}</div>
} }
```

**Input/Output Decorators:**

```typescript
import { Component, input, output, viewChild } from '@angular/core';

@Component({...})
export class ModernComponent {
  // Preferred: input() function
  userId = input.required<string>();
  title = input<string>('Default Title');

  // Preferred: output() function
  itemSelected = output<string>();

  // Preferred: viewChild() function
  childComponent = viewChild<ChildComponent>('child');

  // Avoid old decorators:
  // @Input() userId!: string;
  // @Output() itemSelected = new EventEmitter<string>();
  // @ViewChild('child') childComponent!: ChildComponent;
}
```

### RxJS Best Practices

**Async Pipe and Subscription Management:**

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (users$ | async; as users) {
      @for (user of users; track user.id) {
        <p>{{ user.name }}</p>
      }
    }
  `,
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);

  users$!: Observable<User[]>;

  ngOnInit(): void {
    this.users$ = this.userService.getUsers().pipe(
      map((users) => users.filter((u) => u.active)),
      catchError((error) => {
        console.error('Error loading users:', error);
        return [];
      }),
    );
  }
}
```

**Key RxJS rules:**

- **Use async pipe** in templates to auto-unsubscribe
- **Avoid manual subscriptions** unless necessary (use signals or async pipe)
- **Always handle errors** with `catchError`
- **Use pipeable operators** for transformations

### Form Handling

**Reactive Forms Pattern:**

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `...`,
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    age: [null, [Validators.min(18), Validators.max(100)]],
  });

  onSubmit(): void {
    if (this.form.valid) {
      const value = this.form.getRawValue();
      // Handle submission
    }
  }
}
```

**Form validation in templates:**

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="name" />
  @if (form.get('name')?.invalid && form.get('name')?.touched) {
  <small class="error">
    @if (form.get('name')?.hasError('required')) { Name is required } @if (form.get('name')?.hasError('minlength')) { Minimum 3 characters }
  </small>
  }
  <button type="submit" [disabled]="form.invalid">Submit</button>
</form>
```

### Performance Optimization

**OnPush Change Detection:**

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-optimized',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class OptimizedComponent {
  // Use signals for reactive updates
}
```

**Track Functions in @for:**

```html
<!-- Always provide track function -->
@for (item of items(); track item.id) {
<app-item [data]="item" />
}

<!-- For primitives, use $index -->
@for (name of names(); track $index) {
<p>{{ name }}</p>
}
```

**Lazy Loading Routes:**

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes').then((m) => m.USERS_ROUTES),
  },
];
```

### Testing with Jasmine/Karma

**Component Test Template:**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user.component';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent], // import standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name', () => {
    component.user.set({ name: 'John', id: '1' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('John');
  });
});
```

**Service Test Template:**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users', () => {
    const mockUsers = [{ id: '1', name: 'John' }];

    service.getUsers().subscribe((users) => {
      expect(users.length).toBe(1);
      expect(users[0].name).toBe('John');
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
```

### Accessibility Standards

**Follow WCAG 2.1 Level AA:**

- **Semantic HTML**: Use proper elements (`<button>`, `<nav>`, `<main>`, etc.)
- **ARIA labels**: Add `aria-label` or `aria-labelledby` for interactive elements
- **Keyboard navigation**: Ensure all functionality accessible via keyboard
- **Focus management**: Use `tabindex` appropriately, manage focus on modals
- **Color contrast**: Ensure sufficient contrast ratios (4.5:1 for text)

**Example:**

```html
<button type="button" aria-label="Close dialog" (click)="closeDialog()">
  <i class="pi pi-times"></i>
</button>

<nav aria-label="Main navigation">
  <ul>
    <li><a routerLink="/home">Home</a></li>
    <li><a routerLink="/about">About</a></li>
  </ul>
</nav>
```

### TypeScript Strict Mode

**Enable strict mode in tsconfig.json:**

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  }
}
```

**Type safety best practices:**

- Always define types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` - use `unknown` if type is truly unknown
- Use type guards for narrowing types

## PrimeNG Integration

### Discovering PrimeNG Components

**Before implementing a feature, discover the right PrimeNG component:**

1. **Search for components by feature** using MCP tools:

   ```
   Use mcp_primeng_search_components to find components by keywords
   Use mcp_primeng_suggest_component to get recommendations for specific use cases
   Use mcp_primeng_list_components to see all available components
   ```

2. **Get detailed component documentation**:

   ```
   Use mcp_primeng_get_component for full component details
   Use mcp_primeng_get_component_props for input properties
   Use mcp_primeng_get_component_events for output events
   Use mcp_primeng_get_usage_example for code examples
   ```

3. **Refer to AI-optimized documentation**: https://primeng.org/llms/llms.txt
   - Contains links to all PrimeNG component documentation
   - Optimized for LLM consumption

### Component Import Pattern

PrimeNG uses **standalone component architecture**. Import components directly:

```typescript
import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [TableModule, ButtonModule, InputTextModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  // Component logic
}
```

**Key Rules:**

- Import only the modules you need (tree-shaking optimization)
- Import from `primeng/{component-name}` (e.g., `primeng/table`, `primeng/dialog`)
- Use PrimeNG's standalone module pattern for better code splitting

### Common PrimeNG Components

#### Data Display

- **p-table**: Data tables with sorting, filtering, pagination
- **p-dataView**: Alternative data display with list/grid views
- **p-card**: Content containers
- **p-panel**: Collapsible content sections

#### Form Components

- **p-inputText**: Text input fields
- **p-dropdown**: Dropdown selection
- **p-calendar**: Date picker
- **p-checkbox**: Checkbox inputs
- **p-radioButton**: Radio button inputs
- **p-inputNumber**: Numeric input with increment/decrement
- **p-multiSelect**: Multi-selection dropdown

#### Buttons and Actions

- **p-button**: Primary button component
- **pButton** directive: Style native buttons
- **p-splitButton**: Button with dropdown menu
- **p-menu**: Context menus and dropdowns

#### Feedback and Overlays

- **p-toast**: Notification messages
- **p-dialog**: Modal dialogs
- **p-confirmDialog**: Confirmation prompts
- **p-progressSpinner**: Loading indicators
- **p-progressBar**: Progress indicators

### PrimeNG with Reactive Forms

**Example: Form with PrimeNG components**

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, DropdownModule, ButtonModule, CalendarModule],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    role: [null, Validators.required],
    birthDate: [null],
  });

  readonly roles = signal([
    { label: 'Admin', value: 'admin' },
    { label: 'User', value: 'user' },
    { label: 'Guest', value: 'guest' },
  ]);

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

**Template:**

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <div class="p-fluid">
    <div class="field">
      <label for="name">Name</label>
      <input pInputText id="name" formControlName="name" />
      @if (form.get('name')?.invalid && form.get('name')?.touched) {
      <small class="p-error">Name is required (min 3 characters)</small>
      }
    </div>

    <div class="field">
      <label for="email">Email</label>
      <input pInputText id="email" formControlName="email" type="email" />
      @if (form.get('email')?.invalid && form.get('email')?.touched) {
      <small class="p-error">Valid email is required</small>
      }
    </div>

    <div class="field">
      <label for="role">Role</label>
      <p-dropdown id="role" formControlName="role" [options]="roles()" placeholder="Select a role" optionLabel="label" optionValue="value">
      </p-dropdown>
    </div>

    <div class="field">
      <label for="birthDate">Birth Date</label>
      <p-calendar id="birthDate" formControlName="birthDate" [showIcon]="true"></p-calendar>
    </div>

    <p-button label="Submit" type="submit" [disabled]="form.invalid"></p-button>
  </div>
</form>
```

### PrimeNG Theming

**Project uses custom PrimeNG theme configuration:**

1. **CSS Variables**: Theme defined in global SCSS using PrimeNG design tokens
2. **Component Styling**: Use PrimeFlex utility classes or custom SCSS
3. **Dark Mode Support**: Implement theme switching if required

**Check project files for:**

- `src/styles.scss` - Global theme configuration
- `src/theme/` - Custom theme files
- Angular.json - Theme imports in styles array

### Toast Notifications Pattern

**Use PrimeNG Toast for user feedback:**

```typescript
import { Component, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [ToastModule],
  providers: [MessageService],
  template: `<p-toast></p-toast>`,
})
export class MyComponent {
  private readonly messageService = inject(MessageService);

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
    });
  }

  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }
}
```

**Severity levels:** `success`, `info`, `warn`, `error`

## AWF Framework Integration

### Overview

The **AWF (Advanced Web Framework)** is Siveka's custom component library providing:

- Business-specific components
- Pre-configured PrimeNG component wrappers
- Reusable patterns and layouts
- Domain-specific form controls

**Documentation**: http://wfawfqa.sidmar.be/Showcase.Client/documentation/components/awf-components

### When to Use AWF Components

**Use AWF components when:**

- The component encapsulates business logic specific to Siveka applications
- A pre-configured PrimeNG wrapper exists that matches your use case
- The component provides domain-specific functionality (e.g., patient selectors, medical forms)
- Project standards require AWF components for consistency

**Use PrimeNG directly when:**

- Building generic UI elements (buttons, inputs, tables)
- AWF doesn't provide the specific component you need
- Maximum flexibility is required

### AWF Component Discovery

**Refer to AWF documentation for:**

1. **Component catalog** - Browse available AWF components
2. **Usage examples** - See component integration patterns
3. **API reference** - Input/output properties for each component
4. **Theming** - AWF-specific styling guidelines

**Before implementing a feature:**

1. Check if AWF provides a pre-built component
2. Review AWF documentation for usage patterns
3. Fall back to PrimeNG if AWF doesn't cover the use case

### AWF Component Import Pattern

**Example: Using AWF components**

```typescript
import { Component } from '@angular/core';
import { AwfDataTableComponent } from '@awf/components/data-table';
import { AwfPatientSelectorComponent } from '@awf/components/patient-selector';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [AwfDataTableComponent, AwfPatientSelectorComponent],
  templateUrl: './patient-list.component.html',
})
export class PatientListComponent {
  // Component logic
}
```

**Note:** Exact import paths may vary - consult AWF documentation and existing project code for correct import syntax.

### Combining PrimeNG and AWF

**Projects often use both libraries together:**

```typescript
import { Component } from '@angular/core';
// PrimeNG components
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
// AWF components (example paths)
import { AwfFormComponent } from '@awf/components/form';
import { AwfValidationComponent } from '@awf/components/validation';

@Component({
  selector: 'app-hybrid-component',
  standalone: true,
  imports: [ButtonModule, DialogModule, AwfFormComponent, AwfValidationComponent],
  templateUrl: './hybrid-component.component.html',
})
export class HybridComponent {
  // Use AWF for business logic, PrimeNG for UI primitives
}
```

## Project-Specific Patterns

### Component Structure

**Follow project conventions:**

```
feature-name/
├── components/
│   ├── feature-list/
│   │   ├── feature-list.component.ts
│   │   ├── feature-list.component.html
│   │   ├── feature-list.component.scss
│   │   └── feature-list.component.spec.ts
│   └── feature-detail/
│       ├── feature-detail.component.ts
│       ├── feature-detail.component.html
│       ├── feature-detail.component.scss
│       └── feature-detail.component.spec.ts
├── services/
│   ├── feature.service.ts
│   └── feature.service.spec.ts
├── models/
│   └── feature.model.ts
└── feature.routes.ts
```

### Service Layer Pattern

**HTTP services with typed responses:**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize } from 'rxjs';
import { MessageService } from 'primeng/api';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly baseUrl = '/api/users';

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl).pipe(
      catchError((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load users',
        });
        throw error;
      }),
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.baseUrl, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

### State Management with Signals

**Use signals for component state:**

```typescript
import { Component, inject, signal, computed, effect } from '@angular/core';
import { UserService, User } from './user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `...`,
})
export class UserListComponent {
  private readonly userService = inject(UserService);

  // State
  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);
  readonly selectedUser = signal<User | null>(null);

  // Computed values
  readonly activeUsers = computed(() => this.users().filter((u) => u.active));

  readonly userCount = computed(() => this.users().length);

  constructor() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService
      .getUsers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((users) => this.users.set(users));
  }

  selectUser(user: User): void {
    this.selectedUser.set(user);
  }
}
```

### Internationalization (i18n)

**Move all user-facing text to translation files:**

```typescript
// Use TranslateService or Angular i18n
import { TranslateService } from '@ngx-translate/core';

// Translations in assets/i18n/en.json
{
  "users": {
    "title": "User Management",
    "add": "Add User",
    "edit": "Edit User",
    "delete": "Delete User",
    "confirmDelete": "Are you sure you want to delete this user?"
  }
}
```

**In templates:**

```html
<h1>{{ 'users.title' | translate }}</h1>
<p-button [label]="'users.add' | translate"></p-button>
```

## Development Workflow

### Step 1: Plan the Feature

1. **Identify required components** - Check PrimeNG and AWF documentation
2. **Define data models** - Create TypeScript interfaces
3. **Plan services** - HTTP calls, state management
4. **Consider forms** - Reactive forms with validation

### Step 2: Discover Components

**Use MCP tools for PrimeNG:**

```
1. mcp_primeng_suggest_component - Get component recommendations
2. mcp_primeng_get_component - Retrieve full component details
3. mcp_primeng_get_usage_example - See code examples
```

**Check AWF documentation:**

- Visit: http://wfawfqa.sidmar.be/Showcase.Client/documentation/components/awf-components
- Review component catalog and examples

### Step 3: Implement

1. **Create component** with Angular CLI or manually
2. **Import necessary modules** (PrimeNG, AWF, Angular)
3. **Build template** with external `.html` file
4. **Add styling** in component-scoped SCSS
5. **Implement logic** using signals and `inject()`
6. **Add validation** for forms
7. **Handle errors** with toast notifications

### Step 4: Test

1. **Write unit tests** with Jasmine/Karma
2. **Test user interactions** and form validation
3. **Mock HTTP calls** with `HttpClientTestingModule`
4. **Run tests**: `ng test`

### Step 5: Code Quality

1. **Lint**: `ng lint` or `npm run lint`
2. **Format**: Follow project formatting standards
3. **Build**: `ng build` to ensure no compilation errors
4. **Review accessibility** - ARIA attributes, keyboard navigation

## Common Patterns and Examples

### Data Table with CRUD Operations

```typescript
import { Component, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UserService, User } from './user.service';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [TableModule, ButtonModule, DialogModule],
  template: `
    <p-table [value]="users()" [loading]="loading()">
      <ng-template pTemplate="header">
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-user>
        <tr>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>
            <p-button icon="pi pi-pencil" (onClick)="editUser(user)"></p-button>
            <p-button icon="pi pi-trash" severity="danger" (onClick)="deleteUser(user)"></p-button>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class UserTableComponent {
  private readonly userService = inject(UserService);

  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);

  editUser(user: User): void {
    // Implementation
  }

  deleteUser(user: User): void {
    // Implementation
  }
}
```

### Confirmation Dialog

```typescript
import { Component, inject } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-delete-user',
  standalone: true,
  imports: [ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
  template: `<p-confirmDialog></p-confirmDialog>`,
})
export class DeleteUserComponent {
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  confirmDelete(userId: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Delete logic
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User deleted successfully',
        });
      },
    });
  }
}
```

## Troubleshooting

### PrimeNG Components Not Displaying

**Check:**

1. Module imported correctly in component `imports` array
2. PrimeNG CSS included in `angular.json` or `styles.scss`
3. PrimeIcons CSS loaded for icon display
4. Component syntax matches PrimeNG version in use

### AWF Components Not Found

**Check:**

1. AWF package installed in `package.json`
2. Correct import path (consult AWF documentation)
3. AWF version compatible with Angular version
4. Project-specific AWF setup in `angular.json`

### Form Validation Not Working

**Check:**

1. `ReactiveFormsModule` imported
2. Form controls properly bound with `formControlName`
3. Validators applied in FormGroup definition
4. Template checks form state (`.invalid`, `.touched`)

### Styling Issues

**Check:**

1. Component SCSS properly scoped
2. PrimeNG theme CSS loaded globally
3. CSS variables defined in theme files
4. PrimeFlex utility classes available (if used)

## Best Practices Checklist

- [ ] Use standalone components (no NgModules)
- [ ] External templates (`.html` files) - never inline templates
- [ ] Use `inject()` function instead of constructor injection
- [ ] Use signals for component state
- [ ] Import only needed PrimeNG modules for tree-shaking
- [ ] Check AWF documentation before building custom components
- [ ] Use reactive forms with proper validation
- [ ] Implement error handling with toast notifications
- [ ] Add loading states for async operations
- [ ] Write unit tests for component logic
- [ ] Follow accessibility guidelines (ARIA, semantic HTML)
- [ ] Use TypeScript strict mode - no `any` types
- [ ] Externalize user-facing strings for i18n
- [ ] Run `ng lint` and `ng build` before committing

## Additional Resources

### PrimeNG

- **Documentation**: https://primeng.org/
- **AI Reference**: https://primeng.org/llms/llms.txt
- **MCP Tools**: Use `mcp_primeng_*` commands for component discovery
- **Community**: PrimeNG GitHub and forums

### AWF Framework

- **Documentation**: http://wfawfqa.sidmar.be/Showcase.Client/documentation/components/awf-components
- **Component Showcase**: Browse available components and examples
- **Internal Support**: Contact Siveka development team for AWF-specific questions

### Angular

- **Official Docs**: https://angular.dev/
- **Style Guide**: https://angular.dev/style-guide
- **TypeScript**: https://www.typescriptlang.org/

### Reference

- **AngularExpert Agent**: General Angular patterns and best practices
- **Project Conventions**: Follow existing codebase patterns for consistency
