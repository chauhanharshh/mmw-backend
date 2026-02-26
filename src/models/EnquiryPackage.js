import mongoose from 'mongoose';

const enquiryPackageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        category: {
            type: String,
            enum: ['tour', 'chalo', 'other'],
            default: 'tour'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const EnquiryPackage = mongoose.model('EnquiryPackage', enquiryPackageSchema);
export default EnquiryPackage;
