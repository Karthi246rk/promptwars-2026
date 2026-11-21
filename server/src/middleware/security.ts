import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Standard Security Headers
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Strict Input Sanitization & Comprehensive XSS Prevention
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/<\/?(?:embed|object|iframe|frame|applet|meta|link)\b[^>]*>/gi, '')
    .trim();
}

export function sanitizeObject(obj: any): any {
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

// Strict express-rate-limit instances for authentication, OTP, and report creation
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 OTP requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait before requesting another OTP code.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const reportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // max 60 reports per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded: Maximum issue submission limit reached. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Backward-compatible exports
export const issueSubmissionLimiter = reportRateLimiter;
export const authLimiter = authRateLimiter;

export function resetRateLimits(): void {
  // express-rate-limit handles window expiration automatically
}
