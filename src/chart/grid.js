export function buildVerticalGridLines(ageMin, ageMax) {
  const lines = [];
  for (let age = ageMin; age <= ageMax + 0.0001; age += 0.5) {
    const rounded = Number(age.toFixed(1));
    const isMajor = Number.isInteger(rounded);
    lines.push({ age: rounded, isMajor });
  }
  return lines;
}

export function buildHorizontalGridLines(minValue, maxValue, minorStep, majorStep) {
  const lines = [];
  for (let v = minValue; v <= maxValue + 0.0001; v += minorStep) {
    const rounded = Number(v.toFixed(2));
    const isMajor = Math.abs(rounded % majorStep) < 0.0001 || Math.abs(rounded % majorStep - majorStep) < 0.0001;
    lines.push({ value: rounded, isMajor });
  }
  return lines;
}
