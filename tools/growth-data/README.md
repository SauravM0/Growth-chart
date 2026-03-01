# Growth Data Pipeline

This folder scaffolds a clean data pipeline for generating combined chart curves from authoritative numeric sources.

## Current stage

`npm run growth:generate` currently:
1. Reads source mappings from `tools/growth-data/sources/manifest.json`
2. Reads WHO 2006 numeric tables for 0-5 years from `tools/growth-data/sources/who2006/*.csv`
3. Reads IAP 2015 numeric tables for 5-18 years from `tools/growth-data/sources/iap2015/*.csv`
4. Converts source data to a canonical in-memory schema
5. Applies deterministic WHO↔IAP blending around age 5 years
6. Uses WHO values before blend window and IAP values after blend window
7. Resamples all curves onto a uniform `0.0..18.0` age grid at `0.1` year increments
8. Validates curve quality and ordering rules
9. Writes renderable combined JSON outputs used by the app

No production chart logic is changed by this tool; runtime rendering still consumes the generated JSON files.

## Canonical schema

Defined in `tools/growth-data/schema.ts`.

Each curve record uses:
- `sex`: `"boys" | "girls"`
- `metric`: `"height_cm" | "weight_kg"`
- `centile`: `3 | 10 | 25 | 50 | 75 | 90 | 97`
- `points`: `{ ageYears: number, value: number }[]`

## Validation checks

Implemented in `tools/growth-data/validation.ts`:
- Ages must be strictly increasing inside every curve
- Centiles must match exactly `3,10,25,50,75,90,97`
- Curves must be non-crossing by centile order at shared/interpolated ages
- Values must stay within plausible bounds:
  - `height_cm`: 30 to 250
  - `weight_kg`: 1 to 250

## Source inputs (`sources/`)

The `sources/` directory stores machine-readable references used by generation.

Current contents:
- `who2006/` with numeric 0-5 tables:
  - `boys_height_0_5.csv` / `.json`
  - `boys_weight_0_5.csv` / `.json`
  - `girls_height_0_5.csv` / `.json`
  - `girls_weight_0_5.csv` / `.json`
- `iap2015/` with numeric 5-18 tables:
  - `boys_height_5_18.csv` / `.json`
  - `boys_weight_5_18.csv` / `.json`
  - `girls_height_5_18.csv` / `.json`
  - `girls_weight_5_18.csv` / `.json`
- `manifest.json` for base combined curve inputs (used for age >5 segment)

Expected future additions include:
- Transformation metadata (unit normalization, age grid harmonization, interpolation policy)

Bootstrap helper:
- `npm run growth:who:bootstrap` creates WHO source scaffolding from current machine-readable combined curves.
  Replace these bootstrap values with authoritative WHO 2006 tables when available.
- `npm run growth:iap:bootstrap` creates IAP source scaffolding from current machine-readable combined curves.
  Replace these bootstrap values with authoritative IAP 2015 extracted tables when available.

Guardrail tools:
- `npm run growth:test` runs parser, blending, resampling, ordering, and consistency checks.
- `npm run growth:diff` compares generated curves with the last committed (`HEAD`) curves and prints max absolute deviation per `sex/metric/centile`.
  - Default failure threshold: `0.15` (cm/kg), configurable via `CURVE_DIFF_THRESHOLD`.
  - Override only when explicitly approved: set `CURVE_DIFF_APPROVED=1` (or pass `--allow-over-threshold`).
- `npm run growth:ci` runs generate + tests + diff in one command.
- `npm run growth:regen-and-verify` runs the same strict regeneration + validation sequence locally before review/commit.

## Licensing Notes

- WHO 2006 source tables under `tools/growth-data/sources/who2006/` are committed as machine-readable numeric data for pipeline generation.
- IAP 2015 source tables under `tools/growth-data/sources/iap2015/` are committed as machine-readable numeric data for pipeline generation.
- Keep attribution and licensing terms for WHO content when replacing bootstrap values with authoritative extracted tables.
- Keep attribution and licensing terms for IAP content when replacing bootstrap values with authoritative extracted tables.
- Do not use OCR in application runtime; perform one-time conversion into CSV/JSON and commit those artifacts.

## Blending at 5 Years

To avoid a visible seam at the WHO (0-5) to IAP (5-18) junction, generation applies a small deterministic blend window.

- Default blend window:
  - `startAgeYears`: `4.75`
  - `endAgeYears`: `5.25`
  - `stepYears`: `0.05`
- Configurable in `tools/growth-data/sources/manifest.json` under `blendWindow`.
- Per centile and metric:
  - For ages `< startAgeYears`: WHO values are used.
  - For ages `> endAgeYears`: IAP values are used.
  - For ages inside the window: weighted linear blend  
    `value = (1 - w) * WHO(age) + w * IAP(age)`  
    where `w = (age - start) / (end - start)`, clamped to `[0,1]`.
- WHO and IAP values inside the window are obtained by deterministic linear interpolation with clamped boundaries on each source curve.

This keeps source tables authoritative outside the small transition zone and smooths chart geometry around 5 years.

## Interpolation and Resampling

Generated output curves are resampled onto a uniform age grid for rendering stability:

- Target grid: `0.0` to `18.0` years, step `0.1`.
- Interpolator: monotone piecewise cubic Hermite (PCHIP / Fritsch-Carlson style derivatives).
- Safety fallback: if cubic interpolation for a segment leaves the segment envelope or produces non-finite values, generator falls back to linear interpolation for that sample.
- Source tables remain intact; resampled curves are derived output only.

Validation after resampling includes:
- Envelope check: each resampled point must stay within the min/max of its neighboring source segment endpoints.
- Non-crossing check: centile ordering (`3<=10<=25<=50<=75<=90<=97`) must hold across the full resampled grid.

## Outputs

The generator currently writes:
- `src/data/combined/boys_combined_curves.json`
- `src/data/combined/girls_combined_curves.json`
- `src/data/boys_combined_curves.json`
- `src/data/girls_combined_curves.json`

Each generated file now includes a top-level `metadata` block:
- `whoVersion`
- `iapVersion`
- `generatedAtUtc`
- `gitCommitHash`

The app currently uses the files under `src/data/combined/`.
