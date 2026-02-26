import * as enquiryService from '../services/enquiryService.js';
import { successResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createEnquiry = asyncHandler(async (req, res) => {
    const enquiry = await enquiryService.createEnquiry(req.body);
    successResponse(res, enquiry, 'Enquiry submitted successfully', 201);
});

export const getEnquiries = asyncHandler(async (req, res) => {
    const enquiries = await enquiryService.getAllEnquiries(req.query);
    successResponse(res, enquiries);
});

export const updateEnquiryStatus = asyncHandler(async (req, res) => {
    const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, req.body.status);
    successResponse(res, enquiry, 'Enquiry status updated');
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
    await enquiryService.deleteEnquiry(req.params.id);
    successResponse(res, null, 'Enquiry deleted successfully');
});
