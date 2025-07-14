# Angular Material to PrimeNG Migration Guide

This document provides a comprehensive guide for migrating from Angular Material to PrimeNG. It includes installation instructions, component mappings, key differences, and migration code snippets for each component.

---

## 1. Installation

### Angular Material

```bash
ng add @angular/material
```

### PrimeNG

```bash
npm install primeng primeicons
npm install @angular/animations
```

### Add CSS in `angular.json`

```json
"styles": [
  "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
  "node_modules/primeng/resources/primeng.min.css",
  "node_modules/primeicons/primeicons.css",
  "src/styles.css"
]
```

---

## 2. Component Migration

...[previous content unchanged]...

### Autocomplete

**Material**:

```html
<mat-form-field>
  <input type="text" matInput [matAutocomplete]="auto">
  <mat-autocomplete #auto="matAutocomplete">
    <mat-option *ngFor="let option of filteredOptions" [value]="option">
      {{option}}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
```

**PrimeNG**:

```html
<p-autoComplete [(ngModel)]="selected" [suggestions]="filteredOptions" (completeMethod)="filterOptions($event)"></p-autoComplete>
```

### Tabs

**Material**:

```html
<mat-tab-group>
  <mat-tab label="Tab 1">Content 1</mat-tab>
  <mat-tab label="Tab 2">Content 2</mat-tab>
</mat-tab-group>
```

**PrimeNG**:

```html
<p-tabView>
  <p-tabPanel header="Tab 1">Content 1</p-tabPanel>
  <p-tabPanel header="Tab 2">Content 2</p-tabPanel>
</p-tabView>
```

### Accordion

**Material**:

```html
<mat-accordion>
  <mat-expansion-panel>
    <mat-expansion-panel-header>
      <mat-panel-title>Title</mat-panel-title>
    </mat-expansion-panel-header>
    Content
  </mat-expansion-panel>
</mat-accordion>
```

**PrimeNG**:

```html
<p-accordion>
  <p-accordionTab header="Title">
    Content
  </p-accordionTab>
</p-accordion>
```

### Tree

**Material**:

```html
<mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
  <!-- tree nodes here -->
</mat-tree>
```

**PrimeNG**:

```html
<p-tree [value]="nodes"></p-tree>
```

### TreeTable

**Material**: No native TreeTable, usually custom implementation using mat-table.

**PrimeNG**:

```html
<p-treeTable [value]="files">
  <ng-template pTemplate="header">
    <tr><th>Name</th><th>Size</th></tr>
  </ng-template>
  <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
    <tr>
      <td>{{rowData.name}}</td>
      <td>{{rowData.size}}</td>
    </tr>
  </ng-template>
</p-treeTable>
```

### Virtual Scrolling

**Material**:

```html
<cdk-virtual-scroll-viewport itemSize="50" class="example-viewport">
  <div *cdkVirtualFor="let item of items" class="example-item">{{item}}</div>
</cdk-virtual-scroll-viewport>
```

**PrimeNG**:

```html
<p-virtualScroller [value]="items" [itemSize]="50">
  <ng-template let-item pTemplate="item">
    <div class="item">{{item}}</div>
  </ng-template>
</p-virtualScroller>
```

### Divider

**Material**:

```html
<mat-divider></mat-divider>
```

**PrimeNG**:

```html
<p-divider></p-divider>
```

### Drag and Drop

**Material**:

```html
<div cdkDropList (cdkDropListDropped)="drop($event)">
  <div *ngFor="let item of items" cdkDrag>{{item}}</div>
</div>
```

**PrimeNG**:

```html
<div pDroppable (onDrop)="onDrop($event)">
  <div *ngFor="let item of items" pDraggable="item">{{item}}</div>
</div>
```

### Overlay Panel

**Material**: Uses CDK Overlay.

**PrimeNG**:

```html
<p-overlayPanel #op>
  <ng-template>
    <p>Overlay content</p>
  </ng-template>
</p-overlayPanel>
<button type="button" (click)="op.toggle($event)">Show</button>
```

---

This concludes the component-by-component migration guide. You can now convert your Angular Material-based components to PrimeNG using these patterns.

Would you like this exported as PDF or Markdown?

