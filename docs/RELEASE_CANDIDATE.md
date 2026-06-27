# Release Candidate Notes

## 0.1.0

Classification: ship

Verification planned for every release-candidate PR:

- `npm run check`
- `npm test`
- `npm run build`
- `npm run smoke`
- CLI fixture smoke for clean and high-impact manifests

Known limits:

- Risk classification is deterministic and intentionally conservative.
- Manifests are local evidence packets, not executable connector plans.
