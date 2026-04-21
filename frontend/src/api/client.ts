import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8200';

export async function apiFetch<T>(input: RequestInfo, init: RequestInit & { query?: Record<string, string> } = {}): Promise<T> {
  const authStore = useAuthStore();
  let url = `${API_BASE}${input}`;
  if (init.query) {
    const qs = new URLSearchParams(init.query as Record<string, string>).toString();
    url += `?${qs}`;
    // Remove query from init to avoid passing to fetch
    const { query: _, ...restInit } = init;
    init = restInit as RequestInit;
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authStore.apiKey ? { Authorization: `Bearer ${authStore.apiKey}` } : {}),
    ...init.headers,
  };
  const res = await fetch(url, { ...init, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error?.message || 'API error');
  }
  return data.data as T;
}

export const api = {
  // Users
  register: (username: string, nickname?: string) => apiFetch<{ id: string; username: string; apiKey: string; role: string }>('/api/v1/users/register', { method: 'POST', body: JSON.stringify({ username, nickname }) }),
  getMe: () => apiFetch<{ id: string; username: string; role: string }>('/api/v1/users/me'),
  searchUsers: (q: string) => apiFetch<{ users: Array<{ id: string; username: string; nickname?: string }> }>('/api/v1/users/search', { method: 'GET', query: new URLSearchParams({ q }) }),

  // Friends
  getFriends: () => apiFetch<{ friends: Array<{ id: string; username: string; nickname?: string; friendship: { status: string; createdAt: string } }> }>('/api/v1/friends'),
  sendFriendRequest: (userId: string) => apiFetch<{ id: string }>('/api/v1/friends/requests', { method: 'POST', body: JSON.stringify({ userId }) }),
  handleFriendRequest: (requestId: string, action: 'accept' | 'reject' | 'block') => apiFetch<void>(`/api/v1/friends/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ action }) }),

  // Chat
  getPrivateHistory: (friendId: string, limit?: number, before?: string) => apiFetch<{ messages: any[]; hasMore: boolean; nextCursor?: string }>(`/api/v1/chat/private/${friendId}`, { method: 'GET', query: new URLSearchParams({ limit: limit?.toString() || '50', ...(before ? { before } : {}) }) }),
  sendPrivateMessage: (receiverId: string, content: string, type?: string, replyToId?: string) => apiFetch<any>('/api/v1/chat/private/send', { method: 'POST', body: JSON.stringify({ receiverId, content, type: type || 'text', replyToId }) }),
  markRead: (friendId: string, messageIds?: string[]) => apiFetch<{ markedCount: number }>(`/api/v1/chat/private/${friendId}/read`, { method: 'PATCH', body: JSON.stringify({ messageIds }) }),
  getUnreadCount: (senderId?: string) => apiFetch<{ count: number }>('/api/v1/chat/private/unread-count', { method: 'GET', query: senderId ? new URLSearchParams({ senderId }) : undefined }),

  // Groups
  getGroups: (type: 'joined' | 'public' = 'joined') => apiFetch<any[]>(`/api/v1/groups?type=${type}`),
  createGroup: (name: string, description?: string, isPublic?: boolean) => apiFetch<any>('/api/v1/groups', { method: 'POST', body: JSON.stringify({ name, description, isPublic }) }),
  getGroupDetail: (groupId: string) => apiFetch<any>(`/api/v1/groups/${groupId}`),
  sendGroupMessage: (groupId: string, content: string, type?: string) => apiFetch<any>(`/api/v1/chat/group/${groupId}/send`, { method: 'POST', body: JSON.stringify({ content, type: type || 'text' }) }),
  getGroupMessages: (groupId: string, limit?: number, before?: string) => apiFetch<any>(`/api/v1/chat/group/${groupId}/messages`, { method: 'GET', query: new URLSearchParams({ limit: limit?.toString() || '50', ...(before ? { before } : {}) }) }),

  // Admin
  getStats: () => apiFetch<any>('/api/v1/admin/stats'),
  banUser: (userId: string, reason?: string) => apiFetch<void>(`/api/v1/admin/users/${userId}/ban`, { method: 'PATCH', body: reason ? JSON.stringify({ reason }) : undefined }),
  deleteMessage: (messageId: string) => apiFetch<void>(`/api/v1/admin/messages/${messageId}`, { method: 'DELETE' }),
};