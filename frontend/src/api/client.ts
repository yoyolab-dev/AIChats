import { useAuthStore } from '@/stores/auth';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8200';

type QueryParams = Record<string, string>;

interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown>;
  query?: QueryParams;
}

function toBodyInit(body: BodyInit | Record<string, unknown>): BodyInit {
  if (
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof FormData ||
    typeof body === 'string' ||
    body instanceof ReadableStream
  ) {
    return body;
  }
  return JSON.stringify(body);
}

export async function apiFetch<T>(input: string, init: ApiFetchInit = {}): Promise<T> {
  const authStore = useAuthStore();
  let url = `${API_BASE}${input}`;
  if (init.query) {
    const qs = new URLSearchParams(init.query).toString();
    url += `?${qs}`;
    const { query: _, ...restInit } = init;
    init = restInit as ApiFetchInit;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authStore.apiKey ? { Authorization: `Bearer ${authStore.apiKey}` } : {}),
    ...(init.headers as Record<string, string>),
  };
  const { body: rawBody, ...restInit } = init;
  const fetchInit: RequestInit = {
    ...restInit,
    headers,
    body: rawBody !== undefined && rawBody !== null ? toBodyInit(rawBody) : undefined,
  };
  const res = await fetch(url, fetchInit);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error?.message || 'API error');
  }
  return data.data as T;
}

// Type definitions
interface User {
  id: string;
  username: string;
  nickname?: string | null;
  avatar?: string | null;
  role?: 'USER' | 'ADMIN';
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  createdAt: string;
  type?: string;
  isRead?: boolean;
  readAt?: string | null;
  sender?: {
    id: string;
    username: string;
    nickname: string | null;
    avatar: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      username: string;
      nickname: string | null;
    };
  };
  group?: {
    id: string;
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  memberCount?: number;
  avatar?: string | null;
}

interface Friend {
  id: string;
  username: string;
  nickname?: string | null;
  friendship: {
    status: string;
    createdAt: string;
  };
}

export type { Message, User, Group, Friend };

export const api = {
  // Users
  register: (username: string, nickname?: string) =>
    apiFetch<{ id: string; username: string; apiKey: string; role: 'USER' | 'ADMIN' }>('/api/v1/users/register', {
      method: 'POST',
      body: { username, nickname },
    }),
  getMe: () =>
    apiFetch<{ id: string; username: string; role: 'USER' | 'ADMIN' }>('/api/v1/users/me'),
  searchUsers: (q: string) =>
    apiFetch<{ users: User[] }>('/api/v1/users/search', { method: 'GET', query: { q } }),

  // Friends
  getFriends: () => apiFetch<{ friends: Friend[] }>('/api/v1/friends'),
  sendFriendRequest: (userId: string) =>
    apiFetch<{ id: string }>('/api/v1/friends/requests', { method: 'POST', body: { userId } }),
  handleFriendRequest: (requestId: string, action: 'accept' | 'reject' | 'block') =>
    apiFetch<void>(`/api/v1/friends/requests/${requestId}`, { method: 'PATCH', body: { action } }),

  // Chat
  getPrivateHistory: (friendId: string, limit?: number, before?: string) =>
    apiFetch<{ messages: Message[]; hasMore: boolean; nextCursor?: string }>(`/api/v1/chat/private/${friendId}`, {
      method: 'GET',
      query: { limit: limit?.toString() || '50', ...(before ? { before } : {}) },
    }),
  sendPrivateMessage: (receiverId: string, content: string, type?: string, replyToId?: string) =>
    apiFetch<Message>('/api/v1/chat/private/send', {
      method: 'POST',
      body: { receiverId, content, type: type || 'text', replyToId },
    }),
  markRead: (friendId: string, messageIds?: string[]) =>
    apiFetch<{ markedCount: number }>(`/api/v1/chat/private/${friendId}/read`, {
      method: 'PATCH',
      body: { messageIds },
    }),
  getUnreadCount: (senderId?: string) =>
    apiFetch<{ count: number }>('/api/v1/chat/private/unread-count', {
      method: 'GET',
      query: senderId ? { senderId } : undefined,
    }),

  // Groups
  getGroups: (type: 'joined' | 'public' = 'joined') =>
    apiFetch<Group[]>(`/api/v1/groups?type=${type}`),
  createGroup: (name: string, description?: string, isPublic?: boolean) =>
    apiFetch<Group>('/api/v1/groups', { method: 'POST', body: { name, description, isPublic } }),
  getGroupDetail: (groupId: string) =>
    apiFetch<Group>(`/api/v1/groups/${groupId}`),
  sendGroupMessage: (groupId: string, content: string, type?: string) =>
    apiFetch<Message>(`/api/v1/chat/group/${groupId}/send`, {
      method: 'POST',
      body: { content, type: type || 'text' },
    }),
  getGroupMessages: (groupId: string, limit?: number, before?: string) =>
    apiFetch<{ data: Message[] }>(`/api/v1/chat/group/${groupId}/messages`, {
      method: 'GET',
      query: { limit: limit?.toString() || '50', ...(before ? { before } : {}) },
    }),

  // Upload
  uploadFile: async (file: File) => {
    const authStore = useAuthStore();
    const url = `${API_BASE}/api/v1/upload`;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(authStore.apiKey ? { Authorization: `Bearer ${authStore.apiKey}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    return data.data as { url: string; filename: string; size: number; mimeType: string };
  },

  // Admin
  getStats: () =>
    apiFetch<{ totalUsers: number; totalMessages: number; activeUsers: number }>('/api/v1/admin/stats'),
  banUser: (userId: string, reason?: string) =>
    apiFetch<void>(`/api/v1/admin/users/${userId}/ban`, {
      method: 'PATCH',
      body: reason ? { reason } : undefined,
    }),
  deleteMessage: (messageId: string) =>
    apiFetch<void>(`/api/v1/admin/messages/${messageId}`, { method: 'DELETE' }),
};
