import EnquiryPackage from '../models/EnquiryPackage.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status-codes';

export async function createPackage(data) {
    const existing = await EnquiryPackage.findOne({ name: data.name });
    if (existing) {
        throw new ApiError(httpStatus.CONFLICT, 'Package name already exists');
    }
    return EnquiryPackage.create(data);
}

export async function getAllPackages(filter = {}) {
    return EnquiryPackage.find(filter).sort('name').lean();
}

export async function getActivePackages() {
    return EnquiryPackage.find({ isActive: true }).sort('name').lean();
}

export async function updatePackage(id, data) {
    const pkg = await EnquiryPackage.findByIdAndUpdate(id, data, { new: true });
    if (!pkg) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    return pkg;
}

export async function deletePackage(id) {
    const pkg = await EnquiryPackage.findByIdAndDelete(id);
    if (!pkg) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    return pkg;
}

/**
 * Bulk create packages (useful for initial sync)
 */
export async function bulkSyncPackages(packages) {
    for (const pkg of packages) {
        await EnquiryPackage.findOneAndUpdate(
            { name: pkg.name },
            { $set: { ...pkg, isActive: true } },
            { upsert: true, new: true }
        );
    }
}
