import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        operatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Operator',
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'operator.approve',
                'operator.reject',
                'operator.suspend',
                'operator.unsuspend',
                'operator.delete',
                'operator.create',
                'operator.update',
                'operator.commission_change',
                'operator.password_reset'
            ],
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String
        },
        userAgent: {
            type: String
        }
    },
    {
        timestamps: true,
        // Audit logs are append-only; disable update listeners to prevent accidental modification
        strict: true
    }
);

// TTL index: auto-delete logs older than 2 years (optional, comment out to keep forever)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
