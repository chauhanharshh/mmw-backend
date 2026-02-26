import Enquiry from '../models/Enquiry.js';
import { sendEnquiryNotification } from './mailService.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status-codes';

export async function createEnquiry(data) {
    const enquiry = await Enquiry.create(data);
    // Send async notification (don't block the response)
    sendEnquiryNotification(enquiry);
    return enquiry;
}

export async function getAllEnquiries({ status, sort = '-createdAt', limit = 100 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    return Enquiry.find(filter).sort(sort).limit(limit).lean();
}

export async function updateEnquiryStatus(id, status) {
    const enquiry = await Enquiry.findByIdAndUpdate(id, { status }, { new: true });
    if (!enquiry) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Enquiry not found');
    }
    return enquiry;
}

export async function deleteEnquiry(id) {
    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Enquiry not found');
    }
    return enquiry;
}
