
export interface AnalysisResult {
  columnName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  cp: number | null;
  cpk: number | null;
  usl: number;
  lsl: number;
  outOfToleranceCount: number;
  yield: number;
  data: number[];
}

export interface AIInsight {
  status: 'Critical' | 'Warning' | 'Stable' | 'Excellent';
  summary: string;
  recommendations: string[];
  rootCauseAnalysis: string;
}

export interface CSVData {
  headers: string[];
  rows: Record<string, any>[];
}
