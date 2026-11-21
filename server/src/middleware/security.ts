import { Request, Response, NextFunction } from 'express';

// Standard Security Headers
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Strict Input Sanitization
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      clean[key] = sanitizeObject(obj[key]);
    }
    return clean;
  }
  return obj;
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// In-Memory Rate Limiting
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: {
  name: string;
  windowMs: number;
  max: number;
  message: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    // Extract client IP address
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const key = `${options.name}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      rateLimitBuckets.set(key, bucket);
    } else {
      bucket.count++;
    }

    const remaining = Math.max(0, options.max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000).toString());

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', resetSeconds.toString());
      res.status(429).json({
        error: options.message,
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const issueSubmissionLimiter = createRateLimiter({
  name: 'issues',
  windowMs: 60 * 1000, // 1 minute
  max: 25,
  message: 'Rate limit exceeded: Maximum 25 issue reports per minute. Please try again shortly.',
});

export const authLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
});

export function resetRateLimits(): void {
  rateLimitBuckets.clear();
}
