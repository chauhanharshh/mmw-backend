import PlatformConfig from '../models/PlatformConfig.js';
import ConfigSnapshot from '../models/ConfigSnapshot.js';

/**
 * Returns all platform config as a flat { key: value } map.
 */
export async function getConfig() {
    const entries = await PlatformConfig.find({}).lean();
    return entries.reduce((acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
    }, {});
}

/**
 * Returns all platform config with full metadata (for admin panel).
 */
export async function getConfigWithMeta() {
    const entries = await PlatformConfig.find({})
        .populate('updatedBy', 'name email')
        .lean();
    return entries;
}

/**
 * Bulk upsert config key-value pairs.
 * Saves a snapshot of the current state before applying changes.
 * @param {Array<{ key: string, value: any }>} pairs
 * @param {string} adminUserId
 */
export async function updateConfig(pairs, adminUserId) {
    // 1. Snapshot current state before applying changes
    const current = await getConfig();
    await ConfigSnapshot.create({
        configMap: current,
        savedBy: adminUserId,
        changedKeys: pairs.map(p => p.key),
        note: `Admin save — ${pairs.length} key(s) updated`
    });

    // 2. Prune old snapshots — keep only last 20
    const allSnapshots = await ConfigSnapshot.find({}, '_id createdAt')
        .sort({ createdAt: -1 })
        .lean();
    if (allSnapshots.length > 20) {
        const toDelete = allSnapshots.slice(20).map(s => s._id);
        await ConfigSnapshot.deleteMany({ _id: { $in: toDelete } });
    }

    // 3. Apply changes
    const ops = pairs.map(({ key, value }) => ({
        updateOne: {
            filter: { key },
            update: { $set: { value, updatedBy: adminUserId, key } },
            upsert: true
        }
    }));
    await PlatformConfig.bulkWrite(ops);
    return getConfig();
}

/**
 * Get a single config value by key.
 * @param {string} key
 */
export async function getConfigByKey(key) {
    const entry = await PlatformConfig.findOne({ key }).lean();
    return entry ? entry.value : null;
}

/**
 * Get all snapshots (for rollback UI).
 */
export async function getSnapshots(limit = 20) {
    return ConfigSnapshot.find({})
        .populate('savedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

/**
 * Restore a specific snapshot by ID.
 * Applies all keys from the snapshot's configMap.
 * @param {string} snapshotId
 * @param {string} adminUserId
 */
export async function restoreSnapshot(snapshotId, adminUserId) {
    const snapshot = await ConfigSnapshot.findById(snapshotId).lean();
    if (!snapshot) throw new Error('Snapshot not found');

    const pairs = Object.entries(snapshot.configMap).map(([key, value]) => ({ key, value }));
    await updateConfig(pairs, adminUserId);
    return getConfig();
}
