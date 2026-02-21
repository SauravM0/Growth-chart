/**
 * @typedef {{age:number, v:number}} CurvePoint
 * @typedef {Object} GrowthDataset
 * @property {string} id
 * @property {string} label
 * @property {"F"|"M"} sex
 * @property {number} ageMinYears
 * @property {number} ageMaxYears
 * @property {{unit:"cm", centiles:number[], curves: Record<string, CurvePoint[]>}} height
 * @property {{unit:"kg", centiles:number[], curves: Record<string, CurvePoint[]>}} weight
 */

export {};
