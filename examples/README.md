# Examples

Preview a minimal approval packet:

```bash
node ../dist/src/cli.js preview minimal-approval.yaml --format markdown
```

Write JSON evidence:

```bash
node ../dist/src/cli.js preview minimal-approval.yaml --format json --out /tmp/impact.json
```

## Reusable approval packet

`approval-packet.json` is a fill-in example with a pending decision and the
preview fields needed for review. Generate a preview from a manifest and map
its JSON contract into the `preview` object; do not treat the packet as an
instruction to execute the connector action. The checked-in CRM example
provides a deterministic fixture for verifying those fields:

```bash
npm run build
node dist/src/cli.js preview fixtures/crm-update.yaml --format json --out fixtures/crm-preview.json
npm run approval:check
```

`npm run approval:check` compares the packet's preview object with the fixture
and fails if a field is missing or differs.
