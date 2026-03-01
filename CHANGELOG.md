# Changelog

## Unreleased

### Growth Curves
- Added generated combined-curve dataset metadata (`whoVersion`, `iapVersion`, `generatedAtUtc`, `gitCommitHash`) to support traceability in clinical environments.
- Added a local clinical disclaimer to the combined chart UI:
  `For clinical support; interpret with clinical context; confirm with source references.`
- Added `npm run growth:regen-and-verify` to regenerate curves, run validations, and surface curve diffs before merge.
