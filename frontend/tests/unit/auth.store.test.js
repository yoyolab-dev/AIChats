import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth.js';

// Mock axios
vi.mock('@/utils/axios.js', () => ({
  default: axios
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initial state is empty', () => {
    const store = useAuthStore();
    expect(store.apiKey).toBe('');
    expect(store.user).toBeNull();
  });

  it('login sets user and apiKey on success', async () => {
    const mockUser = { id: 'u1', username: 'test', isAdmin: false };
    axios.get = vi.fn().mockResolvedValue({ data: { success: true, data: mockUser } });

    const store = useAuthStore();
    await store.login('sk-123');

    expect(store.apiKey).toBe('sk-123');
    expect(store.user).toEqual(mockUser);
    expect(localStorage.getItem('apiKey')).toBe('sk-123');
  });

  it('logout clears state and localStorage', () => {
    const store = useAuthStore();
    store.apiKey = 'sk-123';
    store.user = { username: 'test' };
    store.logout();

    expect(store.apiKey).toBe('');
    expect(store.user).toBeNull();
    expect(localStorage.getItem('apiKey')).toBeNull();
  });

  it('initFromStorage restores apiKey from localStorage', () => {
    localStorage.setItem('apiKey', 'sk-from-storage');
    const store = useAuthStore();
    store.initFromStorage();
    expect(store.apiKey).toBe('sk-from-storage');
    expect(store.user).toBeNull();
  });
});