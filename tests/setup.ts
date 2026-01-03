/**
 * Test Setup
 *
 * Configuração global para os testes com Vitest.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock do Decimal.js para evitar problemas de serialização em testes
vi.mock('decimal.js', async () => {
  const actual = await vi.importActual<typeof import('decimal.js')>('decimal.js');
  return actual;
});

// Mock de Date para testes determinísticos
const MOCK_DATE = new Date('2026-01-03T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// Cleanup após cada teste
afterEach(() => {
  vi.clearAllMocks();
});
