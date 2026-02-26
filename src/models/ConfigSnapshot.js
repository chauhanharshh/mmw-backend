import mongoose from 'mongoose';

/**
 * ConfigSnapshot — stores a point-in-time copy of PlatformConfig
 * before each admin save, enabling rollback.
 */
const configSnapshotSchema = new mongoose.Schema(
    {
        /** Flat key→value map of all config at snapshot time */
        configMap: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
        /** Admin who triggered the save that created this snapshot */
        savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        /** Human-readable note (auto-generated or manual) */
        note: { type: String, default: '' },
        /** Number of keys changed in the save that followed this snapshot */
        changedKeys: [{ type: String }],
    },
    { timestamps: true }
);

// Keep only last 20 snapshots — old ones are pruned after each save
configSnapshotSchema.index({ createdAt: -1 });

const ConfigSnapshot = mongoose.model('ConfigSnapshot', configSnapshotSchema);
export default ConfigSnapshot;
