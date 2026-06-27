# Connector Impact Preview

Use this skill when an agent has drafted a connector action and needs a local impact summary before requesting approval.

## Required Inputs

- A JSON or YAML manifest with `connector`, `action`, `target`, `payload`, optional `before`, optional `after`, `evidence`, and `rollback`.

## Side-effect Boundaries

- Reads one local manifest.
- Writes only when `--out` is provided.
- Does not call connector APIs.
- Does not send, post, update, delete, merge, approve, or publish anything.

## Approval Requirements

No approval is needed to preview a local manifest. Executing the connector action is outside this skill and requires explicit approval through the caller's normal workflow.

## Examples

```bash
connector-impact preview fixtures/crm-update.yaml --format markdown
connector-impact preview fixtures/github-comment.json --format json --out tmp/impact.json
```

## Validation

Run `npm run smoke` to preview both a clean CRM field update and a high-impact broad workspace action.
