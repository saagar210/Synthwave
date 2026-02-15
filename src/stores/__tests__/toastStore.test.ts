import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Reset to initial state
    useToastStore.setState({ toasts: [] });
    vi.clearAllTimers();
  });

  describe('addToast', () => {
    it('should add a toast', () => {
      const id = useToastStore.getState().addToast('info', 'Test message');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id);
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].duration).toBe(3000); // default
    });

    it('should add toast with custom duration', () => {
      useToastStore.getState().addToast('success', 'Success!', 5000);

      const toast = useToastStore.getState().toasts[0];
      expect(toast.duration).toBe(5000);
    });

    it('should add multiple toasts', () => {
      useToastStore.getState().addToast('info', 'Message 1');
      useToastStore.getState().addToast('warning', 'Message 2');
      useToastStore.getState().addToast('error', 'Message 3');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts[0].message).toBe('Message 1');
      expect(toasts[1].message).toBe('Message 2');
      expect(toasts[2].message).toBe('Message 3');
    });

    it('should cap toasts at 5 and evict oldest', () => {
      // Add 6 toasts
      for (let i = 1; i <= 6; i++) {
        useToastStore.getState().addToast('info', `Message ${i}`);
      }

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(5);

      // First message should be evicted, so we have 2-6
      expect(toasts[0].message).toBe('Message 2');
      expect(toasts[4].message).toBe('Message 6');
    });

    it('should cap at 5 when adding 10 toasts', () => {
      for (let i = 1; i <= 10; i++) {
        useToastStore.getState().addToast('info', `Message ${i}`);
      }

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(5);

      // Should keep messages 6-10
      expect(toasts[0].message).toBe('Message 6');
      expect(toasts[4].message).toBe('Message 10');
    });

    it('should auto-remove toast after duration', () => {
      vi.useFakeTimers();

      useToastStore.getState().addToast('info', 'Will disappear', 1000);

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1000);

      expect(useToastStore.getState().toasts).toHaveLength(0);

      vi.useRealTimers();
    });

    it('should not auto-remove toast with duration 0', () => {
      vi.useFakeTimers();

      useToastStore.getState().addToast('error', 'Permanent', 0);

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(10000);

      // Should still exist
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.useRealTimers();
    });

    it('should generate unique IDs for each toast', () => {
      const id1 = useToastStore.getState().addToast('info', 'Message 1');
      const id2 = useToastStore.getState().addToast('info', 'Message 2');
      const id3 = useToastStore.getState().addToast('info', 'Message 3');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('removeToast', () => {
    it('should remove toast by ID', () => {
      const id1 = useToastStore.getState().addToast('info', 'Message 1');
      const id2 = useToastStore.getState().addToast('info', 'Message 2');

      expect(useToastStore.getState().toasts).toHaveLength(2);

      useToastStore.getState().removeToast(id1);

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id2);
    });

    it('should handle removing non-existent toast gracefully', () => {
      useToastStore.getState().addToast('info', 'Message 1');

      expect(useToastStore.getState().toasts).toHaveLength(1);

      useToastStore.getState().removeToast('non-existent-id');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it('should remove toast from middle of list', () => {
      const id1 = useToastStore.getState().addToast('info', 'Message 1');
      const id2 = useToastStore.getState().addToast('info', 'Message 2');
      const id3 = useToastStore.getState().addToast('info', 'Message 3');

      useToastStore.getState().removeToast(id2);

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(2);
      expect(toasts[0].id).toBe(id1);
      expect(toasts[1].id).toBe(id3);
    });
  });

  describe('toast types', () => {
    it('should support info type', () => {
      useToastStore.getState().addToast('info', 'Info message');
      expect(useToastStore.getState().toasts[0].type).toBe('info');
    });

    it('should support success type', () => {
      useToastStore.getState().addToast('success', 'Success message');
      expect(useToastStore.getState().toasts[0].type).toBe('success');
    });

    it('should support warning type', () => {
      useToastStore.getState().addToast('warning', 'Warning message');
      expect(useToastStore.getState().toasts[0].type).toBe('warning');
    });

    it('should support error type', () => {
      useToastStore.getState().addToast('error', 'Error message');
      expect(useToastStore.getState().toasts[0].type).toBe('error');
    });
  });

  describe('integration tests', () => {
    it('should handle rapid add/remove operations', () => {
      const ids: string[] = [];

      // Add 5 toasts
      for (let i = 1; i <= 5; i++) {
        ids.push(useToastStore.getState().addToast('info', `Message ${i}`));
      }

      expect(useToastStore.getState().toasts).toHaveLength(5);

      // Remove first 3
      useToastStore.getState().removeToast(ids[0]);
      useToastStore.getState().removeToast(ids[1]);
      useToastStore.getState().removeToast(ids[2]);

      expect(useToastStore.getState().toasts).toHaveLength(2);

      // Add 3 more
      useToastStore.getState().addToast('success', 'New 1');
      useToastStore.getState().addToast('success', 'New 2');
      useToastStore.getState().addToast('success', 'New 3');

      expect(useToastStore.getState().toasts).toHaveLength(5);
    });

    it('should handle mixed durations with auto-removal', () => {
      vi.useFakeTimers();

      useToastStore.getState().addToast('info', 'Short', 1000);
      useToastStore.getState().addToast('info', 'Long', 3000);
      useToastStore.getState().addToast('error', 'Permanent', 0);

      expect(useToastStore.getState().toasts).toHaveLength(3);

      vi.advanceTimersByTime(1000);

      // First toast removed
      expect(useToastStore.getState().toasts).toHaveLength(2);

      vi.advanceTimersByTime(2000);

      // Second toast removed, permanent remains
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].message).toBe('Permanent');

      vi.useRealTimers();
    });

    it('should maintain toast order (FIFO)', () => {
      useToastStore.getState().addToast('info', 'First');
      useToastStore.getState().addToast('success', 'Second');
      useToastStore.getState().addToast('warning', 'Third');

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].message).toBe('First');
      expect(toasts[1].message).toBe('Second');
      expect(toasts[2].message).toBe('Third');
    });
  });
});
