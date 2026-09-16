import AdminAuditLog from '../models/AdminAuditLog.js';

export async function recordAdminAction({ actor, action, targetType, targetId, metadata = {}, request }) {
  return AdminAuditLog.create({
    actorId: actor._id,
    actorRole: actor.role,
    actorAdminLevel: actor.adminLevel || 0,
    action,
    targetType,
    targetId,
    metadata,
    ipAddress: request?.ip || request?.connection?.remoteAddress || '',
    userAgent: request?.headers?.['user-agent'] || '',
  });
}

export async function getAuditLogs(page = 1, limit = 50, action) {
  const query = action ? { action } : {};
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AdminAuditLog.find(query)
      .populate('actorId', 'name email role adminLevel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminAuditLog.countDocuments(query),
  ]);
  return { logs, total };
}
