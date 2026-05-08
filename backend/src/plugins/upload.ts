import { FastifyInstance } from 'fastify';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

// 配置文件上传插件
export async function uploadPlugin(fastify: FastifyInstance) {
  // 确保上传目录存在
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 注册静态资源服务，使上传的文件可以通过 URL 访问
  fastify.register(require('@fastify/static'), {
    root: uploadDir,
    prefix: '/uploads', // 访问路径: /uploads/filename.ext
  });

  // POST /api/v1/upload - 文件上传接口
  fastify.post('/api/v1/upload', {
    preHandler: require('@fastify/multipart').preprocessor({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
      },
    }),
    schema: {
      // 简化 schema：multipart 由插件处理
      response: {
        200: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              required: ['url', 'filename', 'size'],
              properties: {
                url: { type: 'string' },
                filename: { type: 'string' },
                originalName: { type: 'string' },
                size: { type: 'number' },
                mimeType: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = request.body as any;
    if (!data.file) {
      throw fastify.httpErrors.badRequest('No file provided');
    }

    const file = data.file;

    // 验证文件类型（仅允许图片和常见文档）
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw fastify.httpErrors.badRequest('File type not allowed');
    }

    // 生成唯一文件名
    const ext = path.extname(file.filename);
    const newFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, newFilename);

    // 保存文件
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      file.file.pipe(writeStream);
      file.file.on('end', () => resolve());
      file.file.on('error', reject);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    // 构建访问 URL
    const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.hostname}`;
    const url = `${baseUrl}/uploads/${newFilename}`;

    return {
      success: true,
      data: {
        url,
        filename: newFilename,
        originalName: file.filename,
        size: file.fileSize,
        mimeType: file.mimetype,
      },
    };
  });
}
