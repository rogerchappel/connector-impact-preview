# Impact Scoring

Impact scores are deterministic review hints for approval packets.

## Low

Narrow target, non-destructive action, evidence present, rollback notes present, and few changed fields.

## Medium

Missing evidence, missing rollback notes, a write action without a payload or after snapshot, or more than three changed fields.

## High

Destructive action or broad target. Examples include bulk delete, workspace-wide changes, organization-wide updates, or global channel actions.

## Redaction

Secret-like keys are redacted in payloads, changed fields, and target summaries returned by `previewManifest`, before a renderer receives the preview. Redaction is recursive for nested objects and arrays, including every changed field's `before` and `after` values. Target redaction happens before broad-target classification. The default key patterns include token, secret, password, api key, authorization, cookie, and credential.
