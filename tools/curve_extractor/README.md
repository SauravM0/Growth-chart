# Curve Extractor (Semi-Automatic)

This pipeline digitizes centile curves from chart images using manual anchors plus deterministic monotone spline fitting.

Important:
- Output reflects the chart image and anchor quality.
- This does **not** provide independent clinical validation.

## Files

- `extract_curves.py`: main extraction script.
- `anchors/boys_manual_anchors.json`: manual anchors for boys.
- `anchors/girls_manual_anchors.json`: manual anchors for girls.
- `anchors/template_anchors.csv`: optional CSV anchor format sample.
- `run_all.sh`: one-time runner for boys + girls outputs.

## Anchor format (JSON)

Each curve can use either chart coordinates (`ageYears`, `valueY`) or pixel anchors (`x`, `y`).

```json
{
  "sex": "M",
  "imagePath": "../../../public/charts/boys_0_18.png",
  "plotRectPx": { "x": 220, "y": 360, "w": 1800, "h": 2760 },
  "axis": {
    "xMin": 0,
    "xMax": 18,
    "yMin": 0,
    "yMax": 195,
    "sampleStepYears": 0.1
  },
  "curves": [
    {
      "centile": "50",
      "monotonic": "increasing",
      "anchors": [
        { "ageYears": 0, "valueY": 50 },
        { "ageYears": 5, "valueY": 109 },
        { "x": 1400, "y": 1220 }
      ]
    }
  ]
}
```

## Run extraction

From repo root:

```bash
bash tools/curve_extractor/run_all.sh
```

Or single file:

```bash
python3 tools/curve_extractor/extract_curves.py \
  --anchors tools/curve_extractor/anchors/boys_manual_anchors.json \
  --out-curves tools/curve_extractor/out/boys_combined_curves.json \
  --out-preview tools/curve_extractor/preview/boys_overlay.svg
```

## Outputs

- `out/boys_combined_curves.json`
- `out/girls_combined_curves.json`

Format:

```json
[
  {
    "centile": "50",
    "series": [
      { "ageYears": 0.0, "valueY": 50.0 },
      { "ageYears": 0.1, "valueY": 50.7 }
    ]
  }
]
```

- `preview/boys_overlay.svg`
- `preview/girls_overlay.svg`

The preview SVG overlays extracted polylines and anchor points on the source chart image for calibration checks.
