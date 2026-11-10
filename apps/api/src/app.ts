import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { errorHandler } from './middlewares/errorHandler';

import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import posRoutes from './routes/posRoutes';
import supplierRoutes from './routes/supplierRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import customerRoutes from './routes/customerRoutes';
import userRoutes from './routes/userRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import reportRoutes from './routes/reportRoutes';
import shiftRoutes from './routes/shiftRoutes';
import returnRoutes from './routes/returnRoutes';
import settingRoutes from './routes/settingRoutes';
import promotionRoutes from './routes/promotionRoutes';
import bundleRoutes from './routes/bundleRoutes';

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // allow flexible static assets in development
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Whitelist (Protect against cross-origin data theft with credentials)
const allowedOrigins = [
  config.corsOrigin,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server) or in whitelist
      // Also allow local Wi-Fi / LAN IP addresses (192.168.x.x, 10.x.x.x) for local tablet testing
      const isLanOrigin = origin && /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (!origin || allowedOrigins.includes(origin) || isLanOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Akses diblokir oleh kebijakan keamanan CORS.'));
      }
    },
    credentials: true,
  })
);

// 3. Rate Limiter (General API: 500 requests per minute)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak permintaan ke server. Silakan coba kembali sesaat lagi.',
    },
  },
});
app.use('/api', apiLimiter);

// 4. Strict Rate Limiter for Login (Prevent Brute-Force: 15 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'BRUTE_FORCE_PROTECTED',
      message: 'Terlalu banyak percobaan login yang gagal. Akun/IP dibatasi selama 15 menit demi keamanan.',
    },
  },
});
app.use('/api/auth/login', loginLimiter);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'GrosirPOS API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/bundles', bundleRoutes);

// Centralized Error Handler
app.use(errorHandler);

export default app;
