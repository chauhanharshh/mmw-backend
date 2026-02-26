import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        package: {
            type: String,
            required: true
        },
        message: {
            type: String,
            trim: true
        },
        source: {
            type: String,
            default: 'Direct'
        },
        status: {
            type: String,
            enum: ['new', 'contacted', 'resolved'],
            default: 'new',
            index: true
        }
    },
    { timestamps: true }
);

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
