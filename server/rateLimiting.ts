import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Strict: auth endpoints (login, signup, password reset)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
  keyGenerator: (req) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip || 'unknown';
    return ipKeyGenerator(ip);
  },
});

// Moderate: public form submissions (contact, waivers, gift cards)
export const formRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions, please try again later' },
  keyGenerator: (req) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip || 'unknown';
    return ipKeyGenerator(ip);
  },
});
