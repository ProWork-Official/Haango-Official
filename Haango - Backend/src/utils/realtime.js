let realtimeIO = null;

export function registerRealtime(io) {
  realtimeIO = io;
}

export function emitToUser(userId, eventName, payload) {
  if (!realtimeIO || !userId) return;
  realtimeIO.to(String(userId)).emit(eventName, payload);
}