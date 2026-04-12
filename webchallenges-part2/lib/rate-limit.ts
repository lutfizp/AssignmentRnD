type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = store.get(opts.key);

  if (!current || current.resetAt <= now) {
    store.set(opts.key, {
      count: 1,
      resetAt: now + opts.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(opts.limit - 1, 0),
      retryAfterSeconds: Math.ceil(opts.windowMs / 1000),
    };
  }

  current.count += 1;
  store.set(opts.key, current);

  return {
    allowed: current.count <= opts.limit,
    remaining: Math.max(opts.limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

