import { FastifyInstance } from 'fastify';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

// 配置文件上传插件
export async function uploadPlugin(fastify: FastifyInstance) {
  // 确保上传目录存在
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 注册 multipart 插件
  fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB 限制
    },
  });

  // 注册静态资源服务，使上传的文件可以通过 URL 访问
  fastify.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });

  // POST /api/v1/upload - 文件上传接口
  fastify.post('/api/v1/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      throw fastify.httpErrors.badRequest('No file provided');
    }

    // 验证文件类型（仅允许图片和常见文档）
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ];
    if (!allowedTypes.includes(data.mimetype)) {
      throw fastify.httpErrors.badRequest('File type not allowed');
    }

    // 生成唯一文件名
    const ext = path.extname(data.filename);
    const newFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, newFilename);

    // 保存文件
    const buffer = await data.toBuffer();
    await fs.promises.writeFile(filePath, buffer);

    // 构建访问 URL
    const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.hostname}`;
    const url = `${baseUrl}/uploads/${newFilename}`;

    return {
      success: true,
      data: {
        url,
        filename: newFilename,
        originalName: data.filename,
        size: 0, // file size not easily available after toFile
        mimeType: data.mimetype,
      },
    };
  });
}
