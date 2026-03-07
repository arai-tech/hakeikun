export interface Signal {
  id: string;
  name: string;
  wave: string;
  data?: string[];
  showLabels?: boolean;
  showGrid?: boolean;
  hasSlope?: boolean;
  slopeDuration?: number;
  phaseShift?: number;
  hasShift?: boolean;
}

export interface TimingChartConfig {
  signal: (Signal | {})[];
  config?: {
    hscale?: number;
    skin?: string;
  };
}

export interface WaveSegment {
  type: string;
  duration: number;
  dataIndex?: number;
  isGap?: boolean;
}

export interface ParsedSignal {
  name: string;
  segments: WaveSegment[];
  data: string[];
  showLabels?: boolean;
  showGrid?: boolean;
  hasSlope?: boolean;
  slopeDuration?: number;
  phaseShift?: number;
  hasShift?: boolean;
}
