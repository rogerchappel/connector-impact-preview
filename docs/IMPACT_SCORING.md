# Impact Scoring

Impact scores are deterministic review hints for approval packets.

## Low

Narrow target, non-destructive action, evidence present, rollback notes present, and few changed fields.

## Medium

Missing evidence, missing rollback notes, a write action without a payload or after snapshot, or more than three changed fields.

## High

Destructive action or broad target. Examples include bulk delete, workspace-wide changes, organization-wide updates, or global channel actions.

## Redaction

Secret-like keys are redacted in rendered payloads and changed-field output. The default key patterns include token, secret, password, api key, authorization, cookie, and credential.
