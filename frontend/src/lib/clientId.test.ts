import { describe, it, expect, beforeEach } from 'vitest';
import { getClientId } from './clientId';

describe('getClientId', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
