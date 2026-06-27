export type OutputFormat = "markdown" | "json";
export type ImpactLevel = "low" | "medium" | "high";

export interface ConnectorManifest {
  connector: string;
  action: string;
  target: string | string[] | Record<string, unknown>;
  payload?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  evidence?: string[];
  rollback?: string[];
}

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface ImpactPreview {
  connector: string;
  action: string;
  targetSummary: string;
  impact: ImpactLevel;
  changedFields: FieldChange[];
  redactedPayload: Record<string, unknown>;
  evidence: string[];
  rollback: string[];
  warnings: string[];
  execution: "out-of-scope";
}
