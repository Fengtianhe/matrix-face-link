
export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'analysis';
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type ThemeMode = 'MATRIX' | 'CYBER_PUNK' | 'GOLDEN_DATA';
export type GenderMode = 'NEUTRAL' | 'FEMALE' | 'MALE';
