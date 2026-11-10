import dotenv from 'dotenv';
import path from 'path';

// Load .env from apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'grosirpos_fallback_secret_key_minimum_32_chars_2026';

if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('fallback'))) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET wajib dikonfigurasi dengan aman di file .env pada mode produksi.');
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
