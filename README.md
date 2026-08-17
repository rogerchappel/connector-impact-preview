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

`connector` and `action` are non-empty strings. `target` is a non-empty string,
a non-empty array of non-empty strings, or an object with at least one property.
`payload`, `before`, and `after`
are optional objects. `evidence` and `rollback` are optional arrays of non-empty
strings; use an empty array when there are no notes. Malformed fields are
rejected instead of being coerced or discarded.

Action classification accepts verb names written with snake case, kebab case,
spaces, or camel case (for example, `update_contact`, `update-contact`,
`update contact`, and `updateContact`).

The exported `previewManifest(manifest)` API returns an `ImpactPreview` whose
`redactedPayload` and `changedFields` values are already safe to inspect before
rendering. Secret-like keys are redacted recursively inside nested objects and
arrays in both the `before` and `after` values of every changed field.

The CLI grammar is:

```text
connector-impact preview <manifest.json|yaml> [--format markdown|json] [--out file]
connector-impact --help
connector-impact -h
connector-impact help
```

Help forms must be used on their own. The CLI exits nonzero with a concise
error for combined help and preview arguments, extra positional arguments,
unknown long or short options, unsupported formats, or options missing their
values. A flag is never accepted as an option value. Invalid commands are
fully parsed before a manifest is loaded or an output file is written.

The `--out` path must resolve to a different path than the input manifest.
Direct and normalized path collisions exit nonzero without changing the
manifest or creating a preview artifact.

Markdown output keeps manifest-controlled text on one line and escapes Markdown
punctuation so values cannot introduce headings, lists, links, emphasis, or code
spans. JSON output preserves the original string values (subject to secret
redaction).

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

This tool is local-first and non-executing. It never calls connector APIs and never performs the proposed action. Secret-like keys such as `token`, `password`, `apiKey`, `authorization`, and `credential` are redacted by the preview API and from rendered output, including keys nested inside changed-field values, target objects, and arrays.

## Limitations

- Risk scoring is intentionally conservative and deterministic.
- Manifests are not executable plans.
- Organization-specific policy enforcement is out of scope for V1.
