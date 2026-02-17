
import { AnalysisResult } from '../types';

/**
 * Calculates process capability metrics Cp and Cpk.
 * Cp = (USL - LSL) / (6 * Sigma)
 * Cpk = min((USL - Mean) / (3 * Sigma), (Mean - LSL) / (3 * Sigma))
 */
export const calculateStats = (
  data: number[], 
  columnName: string, 
  lsl: number, 
  usl: number
): AnalysisResult => {
  if (data.length === 0) throw new Error("Data array is empty");

  const count = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / count;
  
  // Using Population Standard Deviation to match many industrial calculators, 
  // though Sample StdDev (count - 1) is often used for small samples.
  // We'll use Sample StdDev here for a more conservative estimate.
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (count > 1 ? count - 1 : 1);
  const stdDev = Math.sqrt(variance);
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  const outOfTolerance = data.filter(v => v < lsl || v > usl).length;
  const yieldPct = ((count - outOfTolerance) / count) * 100;

  // Process Capability (Cp) - measures the potential capability
  const cp = stdDev !== 0 ? (usl - lsl) / (6 * stdDev) : 0;

  // Process Capability Index (Cpk) - measures the actual capability (centeredness)
  const cpu = stdDev !== 0 ? (usl - mean) / (3 * stdDev) : 0;
  const cpl = stdDev !== 0 ? (mean - lsl) / (3 * stdDev) : 0;
  const cpk = Math.min(cpu, cpl);

  return {
    columnName,
    mean,
    stdDev,
    min,
    max,
    count,
    cp: Number(cp.toFixed(4)),
    cpk: Number(cpk.toFixed(4)),
    usl,
    lsl,
    outOfToleranceCount: outOfTolerance,
    yield: yieldPct,
    data
  };
};

export const getHistogramData = (data: number[], bins: number = 20) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / bins;
  
  const result = Array.from({ length: bins }, (_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0,
    label: (min + i * binWidth).toFixed(3)
  }));

  data.forEach(val => {
    let binIndex = Math.floor((val - min) / binWidth);
    if (binIndex >= bins) binIndex = bins - 1; 
    if (binIndex < 0) binIndex = 0;
    if (result[binIndex]) result[binIndex].count++;
  });

  return result;
};
