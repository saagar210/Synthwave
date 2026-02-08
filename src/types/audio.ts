export interface AudioFrame {
  spectrum: number[];
  waveform: number[];
  rms: number;
  centroid: number;
  flux: number;
  zcr: number;
  beat: boolean;
  bpm: number;
  timestamp: number;
}

export interface AudioDevice {
  name: string;
  isDefault: boolean;
  isInput: boolean;
}

export interface AudioConfig {
  deviceName: string | null;
  fftSize: number;
  targetFps: number;
}
