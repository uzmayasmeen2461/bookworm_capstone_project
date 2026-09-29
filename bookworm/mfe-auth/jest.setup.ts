// jest.setup.ts — loaded BEFORE the test framework (setupFiles)
// Polyfills required by react-router-dom v7 + jsdom on Node 18/20
import { TextEncoder, TextDecoder } from 'util';

Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder });
Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder });
