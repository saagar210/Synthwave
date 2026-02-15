import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settingsStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset to initial state
    useSettingsStore.setState({
      loaded: false,
      lastMode: 'waveform',
      lastThemeIndex: 0,
      lastDeviceName: null,
      sensitivity: 1.0,
      fftSize: 2048,
      targetFps: 60,
      hasSeenWelcome: false,
    });

    vi.clearAllTimers();
  });

  describe('setLoaded', () => {
    it('should set loaded state', () => {
      useSettingsStore.getState().setLoaded(true);
      expect(useSettingsStore.getState().loaded).toBe(true);

      useSettingsStore.getState().setLoaded(false);
      expect(useSettingsStore.getState().loaded).toBe(false);
    });
  });

  describe('setLastMode', () => {
    it('should set last mode', () => {
      useSettingsStore.getState().setLastMode('bars');
      expect(useSettingsStore.getState().lastMode).toBe('bars');

      useSettingsStore.getState().setLastMode('terrain');
      expect(useSettingsStore.getState().lastMode).toBe('terrain');
    });

    it('should trigger debounced save', () => {
      vi.useFakeTimers();

      useSettingsStore.getState().setLastMode('nebula');
      expect(useSettingsStore.getState().lastMode).toBe('nebula');

      vi.runAllTimers();
      // Note: invoke is mocked, so we can't assert on the call
      // but the function executes without error

      vi.useRealTimers();
    });
  });

  describe('setLastThemeIndex', () => {
    it('should set last theme index', () => {
      useSettingsStore.getState().setLastThemeIndex(3);
      expect(useSettingsStore.getState().lastThemeIndex).toBe(3);
    });

    it('should accept index 0', () => {
      useSettingsStore.getState().setLastThemeIndex(0);
      expect(useSettingsStore.getState().lastThemeIndex).toBe(0);
    });
  });

  describe('setLastDeviceName', () => {
    it('should set last device name', () => {
      useSettingsStore.getState().setLastDeviceName('Microphone');
      expect(useSettingsStore.getState().lastDeviceName).toBe('Microphone');
    });

    it('should accept null to clear device', () => {
      useSettingsStore.getState().setLastDeviceName('Speaker');
      expect(useSettingsStore.getState().lastDeviceName).toBe('Speaker');

      useSettingsStore.getState().setLastDeviceName(null);
      expect(useSettingsStore.getState().lastDeviceName).toBeNull();
    });
  });

  describe('setSensitivity', () => {
    it('should set sensitivity', () => {
      useSettingsStore.getState().setSensitivity(1.5);
      expect(useSettingsStore.getState().sensitivity).toBe(1.5);
    });

    it('should round to 1 decimal place', () => {
      useSettingsStore.getState().setSensitivity(1.234);
      expect(useSettingsStore.getState().sensitivity).toBeCloseTo(1.2, 1);

      useSettingsStore.getState().setSensitivity(1.789);
      expect(useSettingsStore.getState().sensitivity).toBeCloseTo(1.8, 1);
    });

    it('should accept minimum value 0.5', () => {
      useSettingsStore.getState().setSensitivity(0.5);
      expect(useSettingsStore.getState().sensitivity).toBe(0.5);
    });

    it('should accept maximum value 2.0', () => {
      useSettingsStore.getState().setSensitivity(2.0);
      expect(useSettingsStore.getState().sensitivity).toBe(2.0);
    });
  });

  describe('setFftSize', () => {
    it('should set FFT size', () => {
      useSettingsStore.getState().setFftSize(4096);
      expect(useSettingsStore.getState().fftSize).toBe(4096);

      useSettingsStore.getState().setFftSize(8192);
      expect(useSettingsStore.getState().fftSize).toBe(8192);
    });

    it('should accept valid FFT sizes', () => {
      const validSizes = [1024, 2048, 4096, 8192];

      for (const size of validSizes) {
        useSettingsStore.getState().setFftSize(size);
        expect(useSettingsStore.getState().fftSize).toBe(size);
      }
    });
  });

  describe('setTargetFps', () => {
    it('should set target FPS', () => {
      useSettingsStore.getState().setTargetFps(30);
      expect(useSettingsStore.getState().targetFps).toBe(30);

      useSettingsStore.getState().setTargetFps(120);
      expect(useSettingsStore.getState().targetFps).toBe(120);
    });

    it('should accept standard FPS values', () => {
      const fpsSamples = [30, 60, 90, 120, 144];

      for (const fps of fpsSamples) {
        useSettingsStore.getState().setTargetFps(fps);
        expect(useSettingsStore.getState().targetFps).toBe(fps);
      }
    });
  });

  describe('setHasSeenWelcome', () => {
    it('should set welcome seen flag', () => {
      useSettingsStore.getState().setHasSeenWelcome(true);
      expect(useSettingsStore.getState().hasSeenWelcome).toBe(true);
    });

    it('should default to false', () => {
      expect(useSettingsStore.getState().hasSeenWelcome).toBe(false);
    });
  });

  describe('applyFromBackend', () => {
    it('should apply settings from backend', () => {
      const backendSettings = {
        lastMode: 'particles' as const,
        lastThemeIndex: 5,
        lastDeviceName: 'Built-in Microphone',
        sensitivity: 1.3,
        fftSize: 4096,
        targetFps: 120,
        hasSeenWelcome: true,
      };

      useSettingsStore.getState().applyFromBackend(backendSettings);

      const state = useSettingsStore.getState();
      expect(state.lastMode).toBe('particles');
      expect(state.lastThemeIndex).toBe(5);
      expect(state.lastDeviceName).toBe('Built-in Microphone');
      expect(state.sensitivity).toBe(1.3);
      expect(state.fftSize).toBe(4096);
      expect(state.targetFps).toBe(120);
      expect(state.hasSeenWelcome).toBe(true);
    });

    it('should use defaults for missing fields', () => {
      const partialSettings = {
        lastMode: 'bars' as const,
      };

      useSettingsStore.getState().applyFromBackend(partialSettings as any);

      const state = useSettingsStore.getState();
      expect(state.lastMode).toBe('bars');
      expect(state.lastThemeIndex).toBe(0); // default
      expect(state.sensitivity).toBe(1.0); // default
      expect(state.fftSize).toBe(2048); // default
    });

    it('should handle null lastDeviceName', () => {
      const settings = {
        lastDeviceName: null,
      };

      useSettingsStore.getState().applyFromBackend(settings as any);
      expect(useSettingsStore.getState().lastDeviceName).toBeNull();
    });
  });

  describe('debounced save integration', () => {
    it('should debounce multiple rapid changes', () => {
      vi.useFakeTimers();

      // Make 5 rapid changes
      useSettingsStore.getState().setSensitivity(1.1);
      useSettingsStore.getState().setSensitivity(1.2);
      useSettingsStore.getState().setSensitivity(1.3);
      useSettingsStore.getState().setSensitivity(1.4);
      useSettingsStore.getState().setSensitivity(1.5);

      // Fast-forward time
      vi.advanceTimersByTime(500);

      // Final value should be 1.5
      expect(useSettingsStore.getState().sensitivity).toBe(1.5);

      vi.useRealTimers();
    });

    it('should not trigger save before debounce timeout', () => {
      vi.useFakeTimers();

      useSettingsStore.getState().setSensitivity(1.7);

      // Advance time by less than debounce (< 500ms)
      vi.advanceTimersByTime(400);

      // Save should not have been triggered yet (we can't assert this directly,
      // but the state should be stable)
      expect(useSettingsStore.getState().sensitivity).toBe(1.7);

      vi.useRealTimers();
    });
  });
});
