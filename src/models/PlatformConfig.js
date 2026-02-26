import mongoose from 'mongoose';

const platformConfigSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
        category: {
            type: String,
            enum: ['theme', 'content', 'payment', 'feature'],
            default: 'theme'
        },
        description: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);
export default PlatformConfig;
