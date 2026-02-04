// Rate Limiting Middleware

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints
  'auth:signup': { windowMs: 3600000, maxRequests: 3 }, // 3 per hour
  'auth:login': { windowMs: 900000, maxRequests: 5 }, // 5 per 15 min
  'auth:otp': { windowMs: 300000, maxRequests: 3 }, // 3 per 5 min
  
  // Chat/comments
  'chat:send': { windowMs: 60000, maxRequests: 20 }, // 20 per minute
  'comment:create': { windowMs: 60000, maxRequests: 10 }, // 10 per minute
  
  // Gifts
  'gift:send': { windowMs: 1000, maxRequests: 10 }, // 10 per second
  
  // Follow/like actions
  'follow:action': { windowMs: 60000, maxRequests: 50 }, // 50 per minute
  'like:action': { windowMs: 60000, maxRequests: 100 }, // 100 per minute
  
  // Reports
  'report:create': { windowMs: 3600000, maxRequests: 10 }, // 10 per hour
  
  // Video uploads
  'video:upload': { windowMs: 3600000, maxRequests: 10 }, // 10 per hour
  
  // Live streaming
  'live:create': { windowMs: 300000, maxRequests: 3 }, // 3 per 5 min
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  action: string
): { allowed: boolean; retryAfter?: number } {
  const key = `${userId}:${action}`;
  const config = RATE_LIMITS[action];
  
  if (!config) {
    return { allowed: true }; // No limit configured
  }
  
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    // Start new window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }
  
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  record.count++;
  return { allowed: true };
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt + 300000) { // Keep for 5 min after expiry
      rateLimitStore.delete(key);
    }
  }
}, 300000);

// Export for use in API routes
export const rateLimit = (action: string) => {
  return (userId: string) => checkRateLimit(userId, action);
};
