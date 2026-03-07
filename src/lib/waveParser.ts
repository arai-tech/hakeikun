import { ParsedSignal, Signal, WaveSegment } from "../types";

export function parseWave(signal: Signal): ParsedSignal {
  const segments: WaveSegment[] = [];
  const waveStr = signal.wave || "";
  const data = signal.data || [];
  let dataPointer = 0;

  if (waveStr.length === 0) {
    return { name: signal.name, segments: [], data, showLabels: signal.showLabels, showGrid: signal.showGrid };
  }

  let lastChar = "";
  let lastSignalType = "";
  let lastSignalDuration = 1;

  for (let i = 0; i < waveStr.length; i++) {
    const char = waveStr[i];

    if (char === "." || char === ",") {
      const increment = char === "," ? 0.5 : 1;
      if (segments.length > 0) {
        const prevSeg = segments[segments.length - 1];
        if (prevSeg.type === "gap") {
          if (lastSignalType) {
            let dataIndex: number | undefined = undefined;
            if (/[0-9=]/.test(lastSignalType)) {
              dataIndex = dataPointer++;
            }
            // After a gap, repeat the last signal with the specified increment
            segments.push({ type: lastSignalType, duration: increment, dataIndex });
          }
        } else {
          if (['p', 'n', 'd', 'P', 'N', 'D'].includes(prevSeg.type)) {
            // For clocks, repeat the cycle with the specified increment
            segments.push({ ...prevSeg, duration: increment });
          } else {
            // For others, extend the current state
            prevSeg.duration += increment;
            lastSignalDuration = prevSeg.duration;
          }
        }
      }
      lastChar = char;
      continue;
    }

    if (char === "|") {
      segments.push({ type: "gap", duration: 0.5, isGap: true });
      lastChar = char;
      continue;
    }

    // Merge logic for clocks: only if consecutive identical characters in the string
    if (['p', 'n', 'd', 'P', 'N', 'D'].includes(char) && char === lastChar) {
      if (segments.length > 0) {
        const lastSeg = segments[segments.length - 1];
        lastSeg.duration += 1;
        lastSignalDuration = lastSeg.duration;
        lastChar = char;
        continue;
      }
    }

    // Normal character handling
    let type = char;
    
    // Map new characters
    if (char === '_') type = 'L';
    if (char === '~') type = 'H';
    // 'r' and 'f' are kept as is for rendering logic
    
    let dataIndex: number | undefined = undefined;
    if (/[0-9=]/.test(char)) {
      dataIndex = dataPointer++;
    }
    
    const newSeg = { type, duration: 1, dataIndex };
    segments.push(newSeg);
    lastChar = char;
    lastSignalType = type;
    lastSignalDuration = 1;
  }

  return {
    name: signal.name,
    segments,
    data,
    showLabels: signal.showLabels,
    showGrid: signal.showGrid,
    hasSlope: signal.hasSlope,
    slopeDuration: signal.slopeDuration,
    phaseShift: signal.phaseShift,
    hasShift: signal.hasShift,
  };
}
