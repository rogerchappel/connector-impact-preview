# connector-impact-preview

Turn a proposed connector action into a local, reviewable impact summary before asking for approval.

## Quickstart

```bash
npm install
npm run build
node dist/src/cli.js --help
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

`payload`, `before`, and `after` are optional objects. `evidence` and `rollback`
are optional arrays. When present, each field must use that shape; malformed
fields are rejected instead of being discarded.

The CLI exits nonzero with a concise error for unknown options, unsupported
formats, or options missing their values.

## What It Reports

- connector and action
- target summary
- low, medium, or high impact
- changed fields
- redacted payload
- evidence and rollback notes
- warnings for broad targets, destructive actions, missing evidence, and missing rollback notes

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run release:check
npm pack --dry-run
```

CI runs `npm run release:check` on pull requests and pushes to `main`, including the package smoke that verifies built files and pack contents.

## Safety Notes

This tool is local-first and non-executing. It never calls connector APIs and never performs the proposed action. Secret-like keys such as `token`, `password`, `apiKey`, `authorization`, and `credential` are redacted from rendered output, including keys nested inside target objects and arrays.

## Limitations

- Risk scoring is intentionally conservative and deterministic.
- Manifests are not executable plans.
- Organization-specific policy enforcement is out of scope for V1.
