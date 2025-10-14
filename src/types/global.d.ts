/// <reference types="react" />
/// <reference types="react-dom" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
}

export {};
