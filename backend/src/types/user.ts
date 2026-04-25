export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

export interface User {
  id: string;
  username: string;
  nickname?: string | null;
  apiKey: string;
  role: Role;
  avatar?: string | null;
  isOnline: boolean;
  lastSeenAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser {
  /** 公开信息（不含敏感字段） */
  id: string;
  username: string;
  nickname?: string | null;
  role: Role;
  avatar?: string | null;
  isOnline: boolean;
  lastSeenAt?: Date | null;
  createdAt: Date;
}

export interface RegisterUserDto {
  username: string;
  nickname?: string;
  // password 预留，当前不需要
}

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
}

// Fastify Request 扩展，注入 user 信息
export interface FastifyRequestUser {
  id: string;
  username: string;
  role: Role;
}
