import { UserService } from '@/services/userService';
import { prisma } from '@/prisma';

// Mock prisma
jest.mock('@/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with valid data', async () => {
      const data = { username: 'alice', nickname: 'Alice' };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '123',
        username: 'alice',
        nickname: 'Alice',
        apiKey: 'sk_live_xxx',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.register(data);

      expect(result.username).toBe('alice');
      expect(result.apiKey).toMatch(/^sk_live_/);
    });

    it('should throw if username exists', async () => {
      const data = { username: 'alice' };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.register(data)).rejects.toThrow('Username already exists');
    });
  });

  // 更多测试...
});