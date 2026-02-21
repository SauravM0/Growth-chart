export function getMphMarkerPath(x, y) {
  const bracketWidth = 18;
  const cap = 10;
  return `M ${x} ${y - cap} L ${x + bracketWidth} ${y - cap} L ${x + bracketWidth} ${y + cap} L ${x} ${y + cap}`;
}
