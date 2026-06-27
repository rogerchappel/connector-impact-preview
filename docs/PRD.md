# Connector Impact Preview PRD

## One-liner

Connector Impact Preview turns a proposed connector action into a local, reviewable impact summary before an agent asks for approval.

## Problem

Agents can draft connector actions, but reviewers often see only the final payload. They need a deterministic preview of who or what is affected, which fields change, what evidence supports the action, and which rollback notes are missing before any external write is approved.

## Users

- Agents preparing dry-run approval packets.
- Developers reviewing CRM, GitHub, Slack, and project-management connector writes.
- Maintainers auditing side-effect boundaries in reusable skills.

## V1 Scope

- Local-first TypeScript CLI and library.
- `connector-impact preview <manifest>` emits JSON and Markdown reports.
- Accept JSON/YAML manifests with connector, action, target, payload, before/after snapshots, evidence, and rollback notes.
- Classify impact as low, medium, or high using target breadth, action verbs, changed fields, and missing rollback evidence.
- Redact secret-like payload keys in all rendered output.
- Include fixtures for Slack message, GitHub comment, CRM field update, and broad workspace action.

## Non-goals

- Calling external connector APIs.
- Enforcing organization policy.
- Replacing approval ledgers or audit stores.

## Safety

- No network calls in V1.
- Never renders raw secret-like payload values.
- Treat broad targets and destructive actions as high impact.
- Approval packet must state that execution remains out of scope.
