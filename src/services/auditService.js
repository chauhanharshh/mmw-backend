import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/**
 * Write an audit log entry.
 *
 * @param {object} params
 * @param {string} params.adminId   - MongoDB User ID of the acting admin
 * @param {string} [params.operatorId] - MongoDB Operator ID (if applicable)
 * @param {string} params.action    - One of the AuditLog.action enum values
 * @param {object} [params.metadata] - Additional context (before/after state, etc.)
 * @param {import('express').Request} [params.req] - Express request (for IP/UA logging)
 */
export async function logAudit({ adminId, operatorId, action, metadata = {}, req }) {
    try {
        await AuditLog.create({
            adminId,
            operatorId,
            action,
            metadata,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown'
        });
    } catch (err) {
        // Audit log failures must NEVER crash the main request
        logger.error('[AuditLog] Failed to write audit log', { action, adminId, operatorId, err: err.message });
    }
}
