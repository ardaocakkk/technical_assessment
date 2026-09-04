import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getClientId } from './clientId';

describe('getClientId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates and stores a new client id on first call', () => {
    const id = getClientId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem('calculator_client_id')).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getClientId();
    const second = getClientId();
    expect(second).toBe(first);
  });

  it('falls back to a generated id when crypto.randomUUID is unavailable', () => {
    // crypto.randomUUID only exists in secure contexts (HTTPS/localhost).
    vi.stubGlobal('crypto', {});

    const id = getClientId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem('calculator_client_id')).toBe(id);
  });

  it('still returns an id when localStorage throws on read and write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const id = getClientId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('still returns an id when localStorage only throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const id = getClientId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
