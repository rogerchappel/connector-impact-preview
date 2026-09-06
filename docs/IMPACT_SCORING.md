# Impact Scoring

Impact scores are deterministic review hints for approval packets.

## Low

Narrow target, non-destructive action, evidence present, rollback notes present, and few changed fields. Named targets such as `channel #ops` and `team alpha` are narrow.

## Medium

Missing evidence, missing rollback notes, a write action without a payload or after snapshot, or more than three changed fields. Write verbs include create, update, upsert, publish, post, send, comment, assign, change, edit, and write.

## High

Destructive action or broad target. Destructive verbs include delete, remove, archive, merge, close, deactivate, disable, overwrite, purge, and bulk. Broad-target examples include bulk delete, workspace-wide changes, organization-wide updates, global channel actions, an unqualified `team` target, or actions targeting all channels or all teams.

## Redaction

Secret-like keys are redacted in payloads, changed fields, and target summaries returned by `previewManifest`, before a renderer receives the preview. Redaction is recursive for nested objects and arrays, including every changed field's `before` and `after` values. Target redaction happens before broad-target classification. The default key patterns include token, secret, password, api key, authorization, cookie, and credential.
