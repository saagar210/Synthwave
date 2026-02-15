import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualStore, MODES } from '../visualStore';

describe('visualStore', () => {
  beforeEach(() => {
    // Reset to initial state
    useVisualStore.setState({
      mode: 'waveform',
      themeIndex: 0,
      showControls: true,
      showOverlay: true,
      showSettings: false,
      fps: 0,
    });
  });

  describe('setMode', () => {
    it('should set visualization mode', () => {
      useVisualStore.getState().setMode('bars');
      expect(useVisualStore.getState().mode).toBe('bars');

      useVisualStore.getState().setMode('nebula');
      expect(useVisualStore.getState().mode).toBe('nebula');
    });

    it('should accept all valid modes', () => {
      for (const mode of MODES) {
        useVisualStore.getState().setMode(mode);
        expect(useVisualStore.getState().mode).toBe(mode);
      }
    });
  });

  describe('setThemeIndex', () => {
    it('should set theme index', () => {
      useVisualStore.getState().setThemeIndex(3);
      expect(useVisualStore.getState().themeIndex).toBe(3);

      useVisualStore.getState().setThemeIndex(7);
      expect(useVisualStore.getState().themeIndex).toBe(7);
    });

    it('should allow index 0', () => {
      useVisualStore.getState().setThemeIndex(0);
      expect(useVisualStore.getState().themeIndex).toBe(0);
    });
  });

  describe('cycleTheme', () => {
    it('should cycle through themes', () => {
      // Total themes: 9 (based on THEMES.length)
      useVisualStore.setState({ themeIndex: 0 });

      useVisualStore.getState().cycleTheme();
      expect(useVisualStore.getState().themeIndex).toBe(1);

      useVisualStore.getState().cycleTheme();
      expect(useVisualStore.getState().themeIndex).toBe(2);
    });

    it('should wrap around to 0 after last theme', () => {
      // Set to last theme (8)
      useVisualStore.setState({ themeIndex: 8 });

      useVisualStore.getState().cycleTheme();
      expect(useVisualStore.getState().themeIndex).toBe(0);
    });

    it('should cycle through all 9 themes correctly', () => {
      useVisualStore.setState({ themeIndex: 0 });

      for (let i = 1; i <= 9; i++) {
        useVisualStore.getState().cycleTheme();
        expect(useVisualStore.getState().themeIndex).toBe(i % 9);
      }
    });
  });

  describe('toggleControls', () => {
    it('should toggle controls visibility', () => {
      expect(useVisualStore.getState().showControls).toBe(true);

      useVisualStore.getState().toggleControls();
      expect(useVisualStore.getState().showControls).toBe(false);

      useVisualStore.getState().toggleControls();
      expect(useVisualStore.getState().showControls).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      for (let i = 0; i < 10; i++) {
        const before = useVisualStore.getState().showControls;
        useVisualStore.getState().toggleControls();
        const after = useVisualStore.getState().showControls;
        expect(after).toBe(!before);
      }
    });
  });

  describe('toggleOverlay', () => {
    it('should toggle overlay visibility', () => {
      expect(useVisualStore.getState().showOverlay).toBe(true);

      useVisualStore.getState().toggleOverlay();
      expect(useVisualStore.getState().showOverlay).toBe(false);

      useVisualStore.getState().toggleOverlay();
      expect(useVisualStore.getState().showOverlay).toBe(true);
    });
  });

  describe('toggleSettings', () => {
    it('should toggle settings drawer visibility', () => {
      expect(useVisualStore.getState().showSettings).toBe(false);

      useVisualStore.getState().toggleSettings();
      expect(useVisualStore.getState().showSettings).toBe(true);

      useVisualStore.getState().toggleSettings();
      expect(useVisualStore.getState().showSettings).toBe(false);
    });
  });

  describe('setFps', () => {
    it('should set FPS value', () => {
      useVisualStore.getState().setFps(60);
      expect(useVisualStore.getState().fps).toBe(60);

      useVisualStore.getState().setFps(55);
      expect(useVisualStore.getState().fps).toBe(55);
    });

    it('should accept fractional FPS', () => {
      useVisualStore.getState().setFps(59.7);
      expect(useVisualStore.getState().fps).toBeCloseTo(59.7, 1);
    });

    it('should accept zero FPS', () => {
      useVisualStore.getState().setFps(0);
      expect(useVisualStore.getState().fps).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('should maintain independent state for each property', () => {
      useVisualStore.getState().setMode('particles');
      useVisualStore.getState().setThemeIndex(5);
      useVisualStore.getState().toggleControls();
      useVisualStore.getState().toggleOverlay();
      useVisualStore.getState().toggleSettings();
      useVisualStore.getState().setFps(58);

      const state = useVisualStore.getState();
      expect(state.mode).toBe('particles');
      expect(state.themeIndex).toBe(5);
      expect(state.showControls).toBe(false);
      expect(state.showOverlay).toBe(false);
      expect(state.showSettings).toBe(true);
      expect(state.fps).toBe(58);
    });

    it('should handle rapid state changes', () => {
      for (let i = 0; i < 100; i++) {
        useVisualStore.getState().cycleTheme();
      }

      // After 100 cycles: 100 % 9 = 1
      expect(useVisualStore.getState().themeIndex).toBe(1);
    });
  });
});
