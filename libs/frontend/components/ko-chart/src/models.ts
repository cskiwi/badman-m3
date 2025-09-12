export interface OrgChartNode<T = unknown> {
  readonly id?: string;
  readonly name?: string;
  readonly data?: T;
  readonly children?: OrgChartNode[];
  readonly collapsed?: boolean;
  readonly hidden?: boolean;
  readonly nodeClass?: string;
  readonly style?: { [key: string]: string };
  readonly descendantsCount?: number;
}

export type NgxInteractiveOrgChartLayout = 'vertical' | 'horizontal';

export interface OrgChartToggleNodeArgs<T> {
  readonly node: OrgChartNode<T>;
  readonly targetNode: string;
  readonly collapse?: boolean;
}

