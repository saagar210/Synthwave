import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../audioStore';
import type { AudioFrame } from '../../types/audio';

describe('audioStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAudioStore.setState({
      frame: null,
      spectrumData: null,
      waveformData: null,
      smoothedSpectrum: null,
      devices: [],
      isCapturing: false,
      isPaused: false,
      source: null,
      beatIntensity: 0,
      classification: null,
      ollamaAvailable: false,
      isClassifying: false,
      startCaptureFn: null,
      stopCaptureFn: null,
    });
  });

  describe('setFrame', () => {
    it('should set frame data', () => {
      const mockFrame: AudioFrame = {
        spectrum: new Float32Array([0.5, 0.3, 0.2]),
        waveform: new Float32Array([0.1, 0.2, 0.3]),
        rms: 0.5,
        centroid: 1000,
        flux: 0.3,
        zcr: 0.2,
        beat: false,
        beatEnergy: 0.5,
        bpm: 120,
        timestamp: Date.now(),
      };

      useAudioStore.getState().setFrame(mockFrame);

      const state = useAudioStore.getState();
      expect(state.frame).toEqual(mockFrame);
      expect(state.spectrumData).toBeInstanceOf(Float32Array);
      expect(state.waveformData).toBeInstanceOf(Float32Array);
    });

    it('should apply temporal smoothing to spectrum', () => {
      const frame1: AudioFrame = {
        spectrum: new Float32Array([1.0, 1.0, 1.0]),
        waveform: new Float32Array([0.1]),
        rms: 0.5,
        centroid: 1000,
        flux: 0.3,
        zcr: 0.2,
        beat: false,
        beatEnergy: 0.5,
        bpm: 120,
        timestamp: Date.now(),
      };

      useAudioStore.getState().setFrame(frame1);
      const smoothed1 = useAudioStore.getState().smoothedSpectrum!;
      expect(smoothed1[0]).toBe(1.0);

      const frame2: AudioFrame = {
        ...frame1,
        spectrum: new Float32Array([0.0, 0.0, 0.0]),
      };

      useAudioStore.getState().setFrame(frame2);
      const smoothed2 = useAudioStore.getState().smoothedSpectrum!;

      // Smoothing formula: old * 0.7 + new * 0.3
      // 1.0 * 0.7 + 0.0 * 0.3 = 0.7
      expect(smoothed2[0]).toBeCloseTo(0.7, 2);
    });

    it('should set beatIntensity to 1.0 when beat detected', () => {
      const mockFrame: AudioFrame = {
        spectrum: new Float32Array([0.5]),
        waveform: new Float32Array([0.1]),
        rms: 0.5,
        centroid: 1000,
        flux: 0.3,
        zcr: 0.2,
        beat: true,
        beatEnergy: 0.8,
        bpm: 120,
        timestamp: Date.now(),
      };

      useAudioStore.getState().setFrame(mockFrame);

      expect(useAudioStore.getState().beatIntensity).toBe(1.0);
    });
  });

  describe('setDevices', () => {
    it('should set audio devices', () => {
      const devices = [
        { name: 'Microphone', isDefault: true, isInput: true },
        { name: 'Line In', isDefault: false, isInput: true },
      ];

      useAudioStore.getState().setDevices(devices);

      expect(useAudioStore.getState().devices).toEqual(devices);
      expect(useAudioStore.getState().devices).toHaveLength(2);
    });
  });

  describe('setCapturing', () => {
    it('should toggle capturing state', () => {
      useAudioStore.getState().setCapturing(true);
      expect(useAudioStore.getState().isCapturing).toBe(true);

      useAudioStore.getState().setCapturing(false);
      expect(useAudioStore.getState().isCapturing).toBe(false);
    });
  });

  describe('setPaused', () => {
    it('should toggle paused state', () => {
      useAudioStore.getState().setPaused(true);
      expect(useAudioStore.getState().isPaused).toBe(true);

      useAudioStore.getState().setPaused(false);
      expect(useAudioStore.getState().isPaused).toBe(false);
    });
  });

  describe('setSource', () => {
    it('should set audio source', () => {
      useAudioStore.getState().setSource('live');
      expect(useAudioStore.getState().source).toBe('live');

      useAudioStore.getState().setSource('file');
      expect(useAudioStore.getState().source).toBe('file');

      useAudioStore.getState().setSource(null);
      expect(useAudioStore.getState().source).toBeNull();
    });
  });

  describe('decayBeat', () => {
    it('should decay beat intensity by 0.92 multiplier', () => {
      useAudioStore.setState({ beatIntensity: 1.0 });

      useAudioStore.getState().decayBeat();
      expect(useAudioStore.getState().beatIntensity).toBeCloseTo(0.92, 2);

      useAudioStore.getState().decayBeat();
      expect(useAudioStore.getState().beatIntensity).toBeCloseTo(0.8464, 3);
    });

    it('should decay beat intensity to near zero after many iterations', () => {
      useAudioStore.setState({ beatIntensity: 1.0 });

      for (let i = 0; i < 50; i++) {
        useAudioStore.getState().decayBeat();
      }

      expect(useAudioStore.getState().beatIntensity).toBeLessThan(0.05);
    });
  });

  describe('setClassification', () => {
    it('should set AI classification result', () => {
      const classification = {
        genre: 'Electronic',
        mood: 'Energetic',
        energy: 'High',
      };

      useAudioStore.getState().setClassification(classification);
      expect(useAudioStore.getState().classification).toEqual(classification);
    });

    it('should allow clearing classification', () => {
      const classification = {
        genre: 'Rock',
        mood: 'Intense',
        energy: 'High',
      };

      useAudioStore.getState().setClassification(classification);
      expect(useAudioStore.getState().classification).toBeTruthy();

      useAudioStore.getState().setClassification(null);
      expect(useAudioStore.getState().classification).toBeNull();
    });
  });

  describe('setOllamaAvailable', () => {
    it('should set Ollama availability', () => {
      useAudioStore.getState().setOllamaAvailable(true);
      expect(useAudioStore.getState().ollamaAvailable).toBe(true);

      useAudioStore.getState().setOllamaAvailable(false);
      expect(useAudioStore.getState().ollamaAvailable).toBe(false);
    });
  });

  describe('setIsClassifying', () => {
    it('should set classifying state', () => {
      useAudioStore.getState().setIsClassifying(true);
      expect(useAudioStore.getState().isClassifying).toBe(true);

      useAudioStore.getState().setIsClassifying(false);
      expect(useAudioStore.getState().isClassifying).toBe(false);
    });
  });

  describe('setCaptureFns', () => {
    it('should set capture function references', () => {
      const startFn = () => console.log('start');
      const stopFn = () => console.log('stop');

      useAudioStore.getState().setCaptureFns(startFn, stopFn);

      expect(useAudioStore.getState().startCaptureFn).toBe(startFn);
      expect(useAudioStore.getState().stopCaptureFn).toBe(stopFn);
    });

    it('should allow clearing capture functions', () => {
      const startFn = () => {};
      const stopFn = () => {};

      useAudioStore.getState().setCaptureFns(startFn, stopFn);
      expect(useAudioStore.getState().startCaptureFn).toBeTruthy();

      useAudioStore.getState().setCaptureFns(null, null);
      expect(useAudioStore.getState().startCaptureFn).toBeNull();
      expect(useAudioStore.getState().stopCaptureFn).toBeNull();
    });
  });
});
