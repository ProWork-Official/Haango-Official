import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/environment.js';
import { connectDatabase } from './config/database.js';
import { ensureBootstrapAdminUsers } from './services/authService.js';
import { purgeExpiredBookingLocations } from './services/bookingService.js';
import User from './models/User.js';
import CallLog from './models/CallLog.js';
import Message from './models/Message.js';
import { registerRealtime } from './utils/realtime.js';

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.corsOrigins,
    credentials: true,
  },
});
registerRealtime(io);

const CALL_TIMEOUT_MS = 30_000;
const activeCalls = new Map();

const normalizeUserId = (value) => (value === undefined || value === null ? null : String(value));

async function persistCallLog(callId, patch = {}) {
  try {
    await CallLog.findOneAndUpdate(
      { callId },
      {
        $set: {
          callId,
          ...patch,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    console.error('Call log save failed:', error.message);
  }
}

const CALL_STATUS_TEXT = {
  accepted: 'Call accepted',
  rejected: 'Call rejected',
  missed: 'Missed call',
  ended: 'Call ended',
};

async function createConversationCallStatusMessage({ bookingId, callId, fromUserId, toUserId, status }) {
  const safeBookingId = normalizeUserId(bookingId);
  const safeCallId = normalizeUserId(callId);
  const safeFromUserId = normalizeUserId(fromUserId);
  const safeToUserId = normalizeUserId(toUserId);

  if (!safeBookingId || !safeFromUserId || !safeToUserId || !status) return null;

  const messageText = CALL_STATUS_TEXT[status] || 'Call update';
  const query = { bookingId: safeBookingId, type: 'call-status', callStatus: status };
  if (safeCallId) query.callId = safeCallId;

  const existing = await Message.findOne(query).lean();
  if (existing) return existing;

  return Message.create({
    conversationId: `conv_${safeBookingId}`,
    bookingId: safeBookingId,
    senderId: safeFromUserId,
    receiverId: safeToUserId,
    message: messageText,
    type: 'call-status',
    callStatus: status,
    isSystem: true,
    callId: safeCallId,
    isDelivered: true,
    isRead: false,
  });
}

function emitCallEvent(eventName, payload) {
  if (!payload?.toUserId) return;
  io.to(String(payload.toUserId)).emit(eventName, payload);
}

io.use(async (socket, next) => {
  const authToken = socket.handshake.auth?.token
    || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '')
    || socket.handshake.headers?.['x-access-token'];

  if (!authToken) {
    return next(new Error('Authentication required for calls'));
  }

  try {
    const decoded = jwt.verify(authToken, env.jwtSecret);
    const user = await User.findById(decoded.userId).select('_id isActive role');

    if (!user || !user.isActive) {
      return next(new Error('Unauthorized socket connection'));
    }

    socket.user = {
      id: String(user._id),
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.user.id);

  socket.on('join-user', (userId) => {
    const safeUserId = normalizeUserId(userId);
    if (!safeUserId || safeUserId !== socket.user.id) return;
    socket.join(safeUserId);
  });

  socket.on('call:invite', async (payload) => {
    const fromUserId = socket.user?.id;
    const toUserId = normalizeUserId(payload?.toUserId);
    if (!fromUserId || !toUserId || fromUserId === toUserId) return;

    const callId = payload?.callId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const callRecord = {
      callId,
      bookingId: normalizeUserId(payload?.bookingId),
      fromUserId,
      toUserId,
      callerUser: payload?.callerUser || { id: fromUserId, name: 'Caller' },
      status: 'RINGING',
      startedAt: new Date(),
    };

    activeCalls.set(callId, callRecord);

    await persistCallLog(callId, {
      callerId: fromUserId,
      receiverId: toUserId,
      status: 'RINGING',
      startedAt: new Date(),
      reason: 'Outgoing call initiated',
    });

    emitCallEvent('call:invite', {
      ...payload,
      callId,
      bookingId: callRecord.bookingId,
      fromUserId,
      toUserId,
      callerUser: payload?.callerUser || { id: fromUserId, name: 'Caller' },
    });

    setTimeout(async () => {
      const liveCall = activeCalls.get(callId);
      if (!liveCall || liveCall.status !== 'RINGING') return;

      activeCalls.delete(callId);
      await persistCallLog(callId, {
        callerId: fromUserId,
        receiverId: toUserId,
        status: 'MISSED',
        endedAt: new Date(),
        reason: 'No answer within timeout',
      });

      emitCallEvent('call:missed', {
        callId,
        fromUserId,
        toUserId,
        reason: 'No answer within timeout',
      });
    }, CALL_TIMEOUT_MS);
  });

  socket.on('call:answer', async (payload) => {
    const fromUserId = socket.user?.id;
    const toUserId = normalizeUserId(payload?.toUserId);
    const callId = normalizeUserId(payload?.callId);
    if (!fromUserId || !toUserId || !callId) return;

    const liveCall = activeCalls.get(callId);
    if (liveCall) {
      liveCall.status = 'ACCEPTED';
    }

    const bookingId = normalizeUserId(payload?.bookingId) || liveCall?.bookingId;
    await createConversationCallStatusMessage({
      bookingId,
      callId,
      fromUserId,
      toUserId,
      status: 'accepted',
    });

    await persistCallLog(callId, {
      callerId: liveCall?.fromUserId || fromUserId,
      receiverId: liveCall?.toUserId || toUserId,
      status: 'ACCEPTED',
      endedAt: new Date(),
      reason: 'Call accepted',
    });

    emitCallEvent('call:answer', { ...payload, bookingId, callStatus: 'accepted' });
  });

  socket.on('call:reject', async (payload) => {
    const fromUserId = socket.user?.id;
    const toUserId = normalizeUserId(payload?.toUserId);
    const callId = normalizeUserId(payload?.callId);
    if (!fromUserId || !toUserId || !callId) return;

    const liveCall = activeCalls.get(callId);
    if (liveCall) {
      activeCalls.delete(callId);
    }

    const bookingId = normalizeUserId(payload?.bookingId) || liveCall?.bookingId;
    await createConversationCallStatusMessage({
      bookingId,
      callId,
      fromUserId,
      toUserId,
      status: 'rejected',
    });

    await persistCallLog(callId, {
      callerId: liveCall?.fromUserId || toUserId,
      receiverId: liveCall?.toUserId || fromUserId,
      status: 'REJECTED',
      endedAt: new Date(),
      reason: 'Call rejected',
    });

    emitCallEvent('call:reject', { ...payload, bookingId, callStatus: 'rejected' });
  });

  socket.on('call:end', async (payload) => {
    const fromUserId = socket.user?.id;
    const toUserId = normalizeUserId(payload?.toUserId);
    const callId = normalizeUserId(payload?.callId);
    if (!fromUserId || !toUserId || !callId) return;

    const liveCall = activeCalls.get(callId);
    if (liveCall) {
      activeCalls.delete(callId);
    }

    const bookingId = normalizeUserId(payload?.bookingId) || liveCall?.bookingId;
    await createConversationCallStatusMessage({
      bookingId,
      callId,
      fromUserId,
      toUserId,
      status: 'ended',
    });

    await persistCallLog(callId, {
      callerId: liveCall?.fromUserId || toUserId,
      receiverId: liveCall?.toUserId || fromUserId,
      status: 'ENDED',
      endedAt: new Date(),
      durationSeconds: Number(payload?.durationSeconds || 0),
      reason: 'Call ended',
    });

    emitCallEvent('call:end', { ...payload, bookingId, callStatus: 'ended' });
  });

  socket.on('call:timeout', async (payload) => {
    const fromUserId = socket.user?.id;
    const toUserId = normalizeUserId(payload?.toUserId);
    const callId = normalizeUserId(payload?.callId);
    if (!fromUserId || !toUserId || !callId) return;

    const liveCall = activeCalls.get(callId);
    if (liveCall) {
      activeCalls.delete(callId);
    }

    const bookingId = normalizeUserId(payload?.bookingId) || liveCall?.bookingId;
    await createConversationCallStatusMessage({
      bookingId,
      callId,
      fromUserId,
      toUserId,
      status: 'missed',
    });

    await persistCallLog(callId, {
      callerId: liveCall?.fromUserId || fromUserId,
      receiverId: liveCall?.toUserId || toUserId,
      status: 'TIMED_OUT',
      endedAt: new Date(),
      reason: 'Call timed out',
    });

    emitCallEvent('call:missed', {
      callId,
      bookingId,
      fromUserId,
      toUserId,
      reason: 'Call timed out',
      callStatus: 'missed',
    });
  });

  socket.on('webrtc:offer', (payload) => {
    if (normalizeUserId(payload?.fromUserId) !== socket.user.id) return;
    emitCallEvent('webrtc:offer', payload);
  });

  socket.on('webrtc:answer', (payload) => {
    if (normalizeUserId(payload?.fromUserId) !== socket.user.id) return;
    emitCallEvent('webrtc:answer', payload);
  });

  socket.on('webrtc:ice-candidate', (payload) => {
    if (normalizeUserId(payload?.fromUserId) !== socket.user.id) return;
    emitCallEvent('webrtc:ice-candidate', payload);
  });

  socket.on('disconnect', () => {
    if (!socket.user?.id) return;
    for (const [callId, liveCall] of activeCalls.entries()) {
      if (liveCall.fromUserId !== socket.user.id && liveCall.toUserId !== socket.user.id) continue;
      activeCalls.delete(callId);
      persistCallLog(callId, {
        callerId: liveCall.fromUserId,
        receiverId: liveCall.toUserId,
        status: 'ENDED',
        endedAt: new Date(),
        reason: 'Socket disconnected',
      });
      io.to(liveCall.fromUserId).emit('call:end', {
        callId,
        fromUserId: liveCall.fromUserId,
        toUserId: liveCall.toUserId,
        reason: 'Socket disconnected',
      });
      io.to(liveCall.toUserId).emit('call:end', {
        callId,
        fromUserId: liveCall.fromUserId,
        toUserId: liveCall.toUserId,
        reason: 'Socket disconnected',
      });
    }
  });
});

async function start() {
  const connected = await connectDatabase();
  if (connected) {
    await ensureBootstrapAdminUsers();
    const locationCleanup = setInterval(() => {
      purgeExpiredBookingLocations().catch((err) => console.error('Location cleanup failed:', err));
    }, 60 * 60 * 1000);
    locationCleanup.unref();
  }

  httpServer.listen(env.port, () => {
    console.log(`\n✓ Haango API + Socket.IO running on port ${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);
    console.log(`  Client URL: ${env.clientUrl}`);
    console.log(`  Razorpay: ${env.razorpayKeyId ? 'Configured' : 'Not configured'}`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('✗ Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('✗ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('✗ Uncaught exception:', err);
  process.exit(1);
});
