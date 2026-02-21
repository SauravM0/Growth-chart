#!/usr/bin/env python3
"""
Semi-automatic curve digitization pipeline for combined IAP charts.

This tool reads manual anchors, fits monotone splines, exports curve series,
and produces SVG overlays for visual verification against source images.

IMPORTANT: This script reproduces curves from image tracing inputs only.
It does NOT claim clinical validity beyond the source image and anchor quality.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple


@dataclass
class Rect:
    x: float
    y: float
    w: float
    h: float


@dataclass
class Axis:
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    x_step: float


@dataclass
class CurveConfig:
    centile: str
    monotonic: str
    anchors: List[Tuple[float, float]]


@dataclass
class ExtractionConfig:
    sex: str
    image_path: Path
    plot_rect: Rect
    axis: Axis
    curves: List[CurveConfig]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract smooth curve series from manual anchors.")
    parser.add_argument("--anchors", required=True, help="Anchor file path (.json or .csv).")
    parser.add_argument("--out-curves", required=True, help="Output JSON curve file path.")
    parser.add_argument("--out-preview", required=True, help="Output SVG preview path.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if any centile has fewer than 3 anchors.",
    )
    return parser.parse_args()


def read_png_size(path: Path) -> Tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"Unsupported or invalid PNG file: {path}")
    width, height = struct.unpack(">II", header[16:24])
    return int(width), int(height)


def px_to_chart(x: float, y: float, plot_rect: Rect, axis: Axis) -> Tuple[float, float]:
    age = axis.x_min + ((x - plot_rect.x) / plot_rect.w) * (axis.x_max - axis.x_min)
    value = axis.y_min + ((plot_rect.y + plot_rect.h - y) / plot_rect.h) * (axis.y_max - axis.y_min)
    return age, value


def chart_to_px(age: float, value: float, plot_rect: Rect, axis: Axis) -> Tuple[float, float]:
    x = plot_rect.x + ((age - axis.x_min) / (axis.x_max - axis.x_min)) * plot_rect.w
    y = plot_rect.y + plot_rect.h - ((value - axis.y_min) / (axis.y_max - axis.y_min)) * plot_rect.h
    return x, y


def normalize_monotonic_label(label: str) -> str:
    raw = (label or "auto").strip().lower()
    if raw in {"increasing", "inc", "up"}:
        return "increasing"
    if raw in {"decreasing", "dec", "down"}:
        return "decreasing"
    if raw in {"none", "off", "free"}:
        return "none"
    return "auto"


def load_json_config(path: Path) -> ExtractionConfig:
    data = json.loads(path.read_text(encoding="utf-8"))
    plot = data["plotRectPx"]
    axis = data["axis"]

    curves: List[CurveConfig] = []
    for row in data.get("curves", []):
        anchors: List[Tuple[float, float]] = []
        for anchor in row.get("anchors", []):
            if "ageYears" in anchor and "valueY" in anchor:
                anchors.append((float(anchor["ageYears"]), float(anchor["valueY"])))
            elif "x" in anchor and "y" in anchor:
                age, value = px_to_chart(
                    float(anchor["x"]),
                    float(anchor["y"]),
                    Rect(float(plot["x"]), float(plot["y"]), float(plot["w"]), float(plot["h"])),
                    Axis(
                        float(axis["xMin"]),
                        float(axis["xMax"]),
                        float(axis["yMin"]),
                        float(axis["yMax"]),
                        float(axis.get("sampleStepYears", 0.1)),
                    ),
                )
                anchors.append((age, value))

        curves.append(
            CurveConfig(
                centile=str(row["centile"]),
                monotonic=normalize_monotonic_label(row.get("monotonic", "auto")),
                anchors=anchors,
            )
        )

    return ExtractionConfig(
        sex=str(data.get("sex", "")).strip().upper() or "F",
        image_path=(path.parent / data["imagePath"]).resolve() if not os.path.isabs(data["imagePath"]) else Path(data["imagePath"]),
        plot_rect=Rect(float(plot["x"]), float(plot["y"]), float(plot["w"]), float(plot["h"])),
        axis=Axis(
            x_min=float(axis["xMin"]),
            x_max=float(axis["xMax"]),
            y_min=float(axis["yMin"]),
            y_max=float(axis["yMax"]),
            x_step=float(axis.get("sampleStepYears", 0.1)),
        ),
        curves=curves,
    )


def load_csv_config(path: Path) -> ExtractionConfig:
    # CSV format:
    # sex,imagePath,plotX,plotY,plotW,plotH,xMin,xMax,yMin,yMax,sampleStepYears
    # centile,monotonic,ageYears,valueY
    with path.open("r", encoding="utf-8", newline="") as handle:
        rows = [row for row in csv.reader(handle) if row and any(cell.strip() for cell in row)]

    if len(rows) < 2:
        raise ValueError("CSV must include one header metadata row and at least one anchor row.")

    meta = rows[0]
    if len(meta) < 11 or meta[0].strip().lower() != "sex":
        raise ValueError("CSV first row must begin with: sex,imagePath,plotX,plotY,plotW,plotH,xMin,xMax,yMin,yMax,sampleStepYears")

    values = rows[1]
    if len(values) < 11:
        raise ValueError("CSV second row must provide metadata values.")

    sex = values[0].strip().upper() or "F"
    image_path_raw = values[1].strip()
    image_path = (path.parent / image_path_raw).resolve() if not os.path.isabs(image_path_raw) else Path(image_path_raw)
    plot_rect = Rect(float(values[2]), float(values[3]), float(values[4]), float(values[5]))
    axis = Axis(float(values[6]), float(values[7]), float(values[8]), float(values[9]), float(values[10]))

    curve_map: Dict[str, CurveConfig] = {}
    for row in rows[2:]:
        if len(row) < 4:
            continue
        centile = row[0].strip()
        monotonic = normalize_monotonic_label(row[1].strip() if len(row) > 1 else "auto")
        age = float(row[2])
        value = float(row[3])

        if centile not in curve_map:
            curve_map[centile] = CurveConfig(centile=centile, monotonic=monotonic, anchors=[])
        curve_map[centile].anchors.append((age, value))
        if curve_map[centile].monotonic == "auto" and monotonic != "auto":
            curve_map[centile].monotonic = monotonic

    curves = list(curve_map.values())
    return ExtractionConfig(sex=sex, image_path=image_path, plot_rect=plot_rect, axis=axis, curves=curves)


def dedupe_and_sort(points: Sequence[Tuple[float, float]]) -> List[Tuple[float, float]]:
    grouped: Dict[float, List[float]] = {}
    for x, y in points:
        key = round(float(x), 6)
        grouped.setdefault(key, []).append(float(y))
    merged = [(x, sum(vals) / len(vals)) for x, vals in grouped.items()]
    merged.sort(key=lambda item: item[0])
    return merged


def enforce_monotonic(points: List[Tuple[float, float]], mode: str) -> List[Tuple[float, float]]:
    if mode == "auto":
        mode = "increasing" if points[-1][1] >= points[0][1] else "decreasing"
    if mode == "none":
        return points

    ys: List[float] = []
    if mode == "increasing":
        current = -math.inf
        for _, y in points:
            current = max(current, y)
            ys.append(current)
    else:
        current = math.inf
        for _, y in points:
            current = min(current, y)
            ys.append(current)

    return [(points[idx][0], ys[idx]) for idx in range(len(points))]


def pchip_slopes(xs: Sequence[float], ys: Sequence[float]) -> List[float]:
    n = len(xs)
    if n == 2:
        slope = (ys[1] - ys[0]) / (xs[1] - xs[0])
        return [slope, slope]

    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    delta = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n

    for k in range(1, n - 1):
        if delta[k - 1] == 0.0 or delta[k] == 0.0 or delta[k - 1] * delta[k] < 0.0:
            m[k] = 0.0
        else:
            w1 = 2.0 * h[k] + h[k - 1]
            w2 = h[k] + 2.0 * h[k - 1]
            m[k] = (w1 + w2) / ((w1 / delta[k - 1]) + (w2 / delta[k]))

    m0 = ((2.0 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1])
    if m0 * delta[0] <= 0:
        m0 = 0.0
    elif delta[0] * delta[1] < 0 and abs(m0) > abs(3.0 * delta[0]):
        m0 = 3.0 * delta[0]
    m[0] = m0

    mn = ((2.0 * h[-1] + h[-2]) * delta[-1] - h[-1] * delta[-2]) / (h[-1] + h[-2])
    if mn * delta[-1] <= 0:
        mn = 0.0
    elif delta[-1] * delta[-2] < 0 and abs(mn) > abs(3.0 * delta[-1]):
        mn = 3.0 * delta[-1]
    m[-1] = mn

    return m


def pchip_eval(xs: Sequence[float], ys: Sequence[float], ms: Sequence[float], x: float) -> float:
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]

    lo = 0
    hi = len(xs) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if xs[mid] <= x:
            lo = mid
        else:
            hi = mid

    i = lo
    h = xs[i + 1] - xs[i]
    t = (x - xs[i]) / h
    t2 = t * t
    t3 = t2 * t

    h00 = 2 * t3 - 3 * t2 + 1
    h10 = t3 - 2 * t2 + t
    h01 = -2 * t3 + 3 * t2
    h11 = t3 - t2

    return h00 * ys[i] + h10 * h * ms[i] + h01 * ys[i + 1] + h11 * h * ms[i + 1]


def centile_sort_key(value: str):
    try:
        return (0, float(value))
    except ValueError:
        return (1, value)


def fit_curve_series(curve: CurveConfig, axis: Axis, strict: bool) -> List[Dict[str, float]]:
    points = dedupe_and_sort(curve.anchors)
    if len(points) < 2:
        raise ValueError(f"Curve {curve.centile}: at least 2 anchors required.")
    if strict and len(points) < 3:
        raise ValueError(f"Curve {curve.centile}: strict mode requires at least 3 anchors.")

    points = enforce_monotonic(points, curve.monotonic)
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    ms = pchip_slopes(xs, ys)

    series: List[Dict[str, float]] = []
    steps = int(round((axis.x_max - axis.x_min) / axis.x_step))
    for idx in range(steps + 1):
        age = axis.x_min + idx * axis.x_step
        value = pchip_eval(xs, ys, ms, age)
        value = min(axis.y_max, max(axis.y_min, value))
        series.append({"ageYears": round(age, 4), "valueY": round(value, 4)})

    if series[-1]["ageYears"] < round(axis.x_max, 4):
        series.append({"ageYears": round(axis.x_max, 4), "valueY": round(min(axis.y_max, max(axis.y_min, pchip_eval(xs, ys, ms, axis.x_max))), 4)})

    return series


def color_for_centile(centile: str) -> str:
    palette = [
        "#dc2626",
        "#2563eb",
        "#16a34a",
        "#a855f7",
        "#ea580c",
        "#0891b2",
        "#4f46e5",
        "#9333ea",
    ]
    return palette[sum(ord(ch) for ch in centile) % len(palette)]


def render_preview_svg(
    cfg: ExtractionConfig,
    image_size: Tuple[int, int],
    fitted: List[Dict[str, object]],
    out_path: Path,
) -> None:
    width, height = image_size

    lines: List[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
    )
    image_href = os.path.relpath(cfg.image_path, out_path.parent).replace("\\", "/")
    lines.append(f'  <image href="{image_href}" x="0" y="0" width="{width}" height="{height}" />')

    lines.append(
        f'  <rect x="{cfg.plot_rect.x}" y="{cfg.plot_rect.y}" width="{cfg.plot_rect.w}" height="{cfg.plot_rect.h}" fill="none" stroke="#111827" stroke-width="2"/>'
    )

    for row in fitted:
        centile = str(row["centile"])
        color = color_for_centile(centile)
        series = row["series"]
        points = []
        for sample in series:
            x, y = chart_to_px(sample["ageYears"], sample["valueY"], cfg.plot_rect, cfg.axis)
            points.append(f"{round(x, 2)},{round(y, 2)}")

        lines.append(
            f'  <polyline points="{" ".join(points)}" fill="none" stroke="{color}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" />'
        )

    for curve in cfg.curves:
        color = color_for_centile(curve.centile)
        for age, value in curve.anchors:
            x, y = chart_to_px(age, value, cfg.plot_rect, cfg.axis)
            lines.append(f'  <circle cx="{round(x,2)}" cy="{round(y,2)}" r="4" fill="{color}" stroke="#ffffff" stroke-width="1"/>')

    lines.append("</svg>")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def load_config(path: Path) -> ExtractionConfig:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return load_json_config(path)
    if suffix == ".csv":
        return load_csv_config(path)
    raise ValueError("Unsupported anchor file format. Use .json or .csv")


def main() -> int:
    args = parse_args()

    anchors_path = Path(args.anchors).resolve()
    out_curves_path = Path(args.out_curves).resolve()
    out_preview_path = Path(args.out_preview).resolve()

    cfg = load_config(anchors_path)
    image_size = read_png_size(cfg.image_path)

    fitted: List[Dict[str, object]] = []
    for curve in sorted(cfg.curves, key=lambda row: centile_sort_key(row.centile)):
        series = fit_curve_series(curve, cfg.axis, strict=args.strict)
        fitted.append({"centile": curve.centile, "series": series})

    out_curves_path.parent.mkdir(parents=True, exist_ok=True)
    out_preview_path.parent.mkdir(parents=True, exist_ok=True)

    out_curves_path.write_text(json.dumps(fitted, indent=2), encoding="utf-8")
    render_preview_svg(cfg, image_size, fitted, out_preview_path)

    print(f"Wrote curves: {out_curves_path}")
    print(f"Wrote preview: {out_preview_path}")
    print("Note: Output reflects image tracing anchors, not independent clinical validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
