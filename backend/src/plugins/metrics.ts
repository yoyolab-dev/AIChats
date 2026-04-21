import { FastifyInstance } from 'fastify';
import * as prom from 'prom-client';

// 创建指标寄存器
const register = new prom.Registry();

// 通用指标
const httpRequestsTotal = new prom.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'url', 'status'],
  registers: [register],
});

const httpRequestDurationSeconds = new prom.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'url', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const activeConnectionsGauge = new prom.Gauge({
  name: 'active_websocket_connections',
  help: 'Current active WebSocket connections',
  registers: [register],
});

export async function metricsPlugin(fastify: FastifyInstance) {
  // 挂载到 fastify 以便外部更新
  fastify.metrics = { activeConnectionsGauge, httpRequestsTotal, httpRequestDurationSeconds };

  // 收集指标路由
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return await register.metrics();
  });

  // 自动收集 HTTP 指标
  fastify.addHook('onRequest', (request, reply, done) => {
    request.metricsStart = Date.now();
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    const duration = (Date.now() - (request.metricsStart as number)) / 1000;
    const method = request.method;
    const url = request.url;
    const status = reply.statusCode;

    httpRequestsTotal.inc({ method, url, status });
    httpRequestDurationSeconds.observe({ method, url, status }, duration);
    done();
  });

  // 定期更新 WebSocket 连接数
  setInterval(() => {
    if (global.wsManager) {
      activeConnectionsGauge.set(global.wsManager.getTotalConnections());
    }
  }, 10000);
}