# Orchestration

Use Connector Impact Preview before asking a reviewer to approve a connector write.

1. Write a manifest describing the connector, action, target, payload, optional before/after snapshots, evidence, and rollback notes.
2. Run `connector-impact preview <manifest> --format markdown`.
3. Review affected fields, evidence gaps, rollback gaps, and impact level.
4. Attach the Markdown or JSON report to the approval request.

The tool never executes the connector action. It only reads a local manifest and writes output when `--out` is provided.
