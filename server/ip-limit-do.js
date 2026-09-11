import { DurableObject } from 'cloudflare:workers';
import { LIMITS } from './relay-core.js';

export class IpLimitDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.hits = [];
  }

  async fetch() {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < LIMITS.ipWindowMs);
    const allowed = this.hits.length < LIMITS.ipLimit;
    if (allowed) this.hits.push(now);
    return new Response(allowed ? '1' : '0');
  }
}
