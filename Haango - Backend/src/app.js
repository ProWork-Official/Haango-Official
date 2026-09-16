import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/environment.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import buddyRoutes from './routes/buddyRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import * as walletController from './controllers/walletController.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { getDbStatus } from './config/database.js';

const app = express();

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-refresh-token'],
  })
);

// razorpay test card 4100 2800 0000 1007

app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buffer) => {
    req.rawBody = buffer.toString();
  },
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, try again later', errorCode: 'RATE_LIMIT' },
});
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'Haango API',
    status: 'healthy',
    database: getDbStatus(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/buddies', buddyRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/analytics', analyticsRoutes);
app.get('/api/admin/withdrawals', requireAuth, requireAdmin, walletController.adminGetWithdrawals);
app.patch('/api/admin/withdrawals/:id', requireAuth, requireAdmin, walletController.adminUpdateWithdrawal);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
