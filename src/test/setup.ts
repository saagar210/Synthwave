import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia (for Tailwind CSS)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
  if (type === 'webgl2' || type === 'webgl') {
    return {
      canvas: document.createElement('canvas'),
      clearColor: vi.fn(),
      clear: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform3fv: vi.fn(),
      uniform4fv: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      viewport: vi.fn(),
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => ''),
      getShaderInfoLog: vi.fn(() => ''),
      getUniformLocation: vi.fn(() => ({})),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      createTexture: vi.fn(() => ({})),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      activeTexture: vi.fn(),
      createFramebuffer: vi.fn(() => ({})),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      getExtension: vi.fn(() => null),
      getError: vi.fn(() => 0),
      deleteShader: vi.fn(),
      deleteProgram: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteTexture: vi.fn(),
      deleteFramebuffer: vi.fn(),
    };
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({
  getTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
})) as any;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }));
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return Math.random();
}) as any;

global.cancelAnimationFrame = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock MediaRecorder
global.MediaRecorder = class MediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: string = 'inactive';
  mimeType: string = 'video/webm';

  constructor() {}
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
} as any;

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    isFullscreen: vi.fn(() => Promise.resolve(false)),
    setFullscreen: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
