# connector-impact-preview

Turn a proposed connector action into a local, reviewable impact summary before asking for approval.

## Quickstart

```bash
npm install
npm run build
node dist/src/cli.js preview fixtures/crm-update.yaml --format markdown
```

JSON output is available for approval packets or audit evidence:

```bash
node dist/src/cli.js preview fixtures/github-comment.json --format json --out tmp/impact.json
```

## Manifest Shape

```yaml
connector: crm
action: update_contact
target:
  type: contact
  id: c_123
payload:
  stage: qualified
before:
  stage: lead
after:
  stage: qualified
evidence:
  - "Call notes mention budget and project owner."
rollback:
  - "Set stage back to lead if rejected."
```

## What It Reports

- connector and action
- target summary
- low, medium, or high impact
- changed fields
- redacted payload
- evidence and rollback notes
- warnings for broad targets, destructive actions, missing evidence, and missing rollback notes

## Safety Notes

This tool is local-first and non-executing. It never calls connector APIs and never performs the proposed action. Secret-like keys such as `token`, `password`, `apiKey`, `authorization`, and `credential` are redacted from rendered output.

## Development

```bash
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- Risk scoring is intentionally conservative and deterministic.
- Manifests are not executable plans.
- Organization-specific policy enforcement is out of scope for V1.
