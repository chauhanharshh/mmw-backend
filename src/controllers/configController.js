import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import * as configService from '../services/platformConfigService.js';
import { logAudit } from '../services/auditService.js';

/**
 * GET /api/config
 * Public endpoint — returns all platform config as a flat key/value map.
 */
export const getConfigController = asyncHandler(async (req, res) => {
    const config = await configService.getConfig();
    return successResponse(res, { config }, null);
});

/**
 * GET /api/admin/config
 * Admin-only — returns full config entries with metadata (updatedBy, timestamps).
 */
export const getAdminConfigController = asyncHandler(async (req, res) => {
    const entries = await configService.getConfigWithMeta();
    return successResponse(res, { entries }, null);
});

/**
 * PUT /api/admin/config
 * Admin-only — bulk upsert config key-value pairs.
 * Body: { pairs: [{ key: string, value: any }] }
 * Saves a snapshot before applying changes.
 */
export const updateConfigController = asyncHandler(async (req, res) => {
    const { pairs } = req.body;

    if (!Array.isArray(pairs) || pairs.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'pairs must be a non-empty array' } });
    }

    const invalid = pairs.find(p => typeof p.key !== 'string' || p.key.trim() === '');
    if (invalid) {
        return res.status(400).json({ success: false, error: { message: 'Each pair must have a non-empty string key' } });
    }

    const config = await configService.updateConfig(pairs, req.user._id);

    await logAudit({
        adminId: req.user._id,
        operatorId: null,
        action: 'config.update',
        metadata: { keys: pairs.map(p => p.key) },
        req
    });

    return successResponse(res, { config }, 'Configuration updated successfully');
});

/**
 * GET /api/admin/config/snapshots
 * Admin-only — returns list of config snapshots for rollback.
 */
export const getSnapshotsController = asyncHandler(async (req, res) => {
    const snapshots = await configService.getSnapshots(20);
    return successResponse(res, { snapshots }, null);
});

/**
 * POST /api/admin/config/restore/:snapshotId
 * Admin-only — restores a specific snapshot.
 */
export const restoreSnapshotController = asyncHandler(async (req, res) => {
    const { snapshotId } = req.params;
    const config = await configService.restoreSnapshot(snapshotId, req.user._id);

    await logAudit({
        adminId: req.user._id,
        operatorId: null,
        action: 'config.rollback',
        metadata: { snapshotId },
        req
    });

    return successResponse(res, { config }, 'Configuration restored from snapshot');
});
