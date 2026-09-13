import "@testing-library/react";

// Mocking window.AudioContext for testing environment
class MockAudioContext {
  createOscillator() {
    return {
      type: "sine",
      frequency: {
        value: 440,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        setTargetAtTime: () => {},
      },
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        setTargetAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    };
  }
  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: {
        value: 1000,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      Q: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    };
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(44100),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
  get sampleRate() {
    return 44100;
  }
  get state() {
    return "running";
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

// @ts-expect-error Mock audio context on window
window.AudioContext = MockAudioContext;
// Mock IntersectionObserver for jsdom environment
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error Mock IntersectionObserver on window
window.IntersectionObserver = MockIntersectionObserver;

// Mock matchMedia for PWA display-mode detection
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
