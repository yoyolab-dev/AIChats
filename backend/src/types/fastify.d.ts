import 'fastify';
import { HttpErrors } from '@fastify/sensible';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

declare module 'fastify' {
  interface FastifyInstance {
    httpErrors: HttpErrors;
    authenticateAdmin: (request: any, reply: any) => Promise<void>;
    metrics: {
      registry: Registry;
      requestCounter: Counter;
      requestDuration: Histogram;
      activeConnectionsGauge: Gauge;
    };
  }

  interface FastifyRequest {
    metricsStart: number;
  }
}
