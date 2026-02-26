import * as enquiryPackageService from '../services/enquiryPackageService.js';
import { successResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createPackage = asyncHandler(async (req, res) => {
    const pkg = await enquiryPackageService.createPackage(req.body);
    successResponse(res, pkg, 'Package created successfully', 201);
});

export const getAllPackages = asyncHandler(async (req, res) => {
    const pkgs = await enquiryPackageService.getAllPackages(req.query);
    successResponse(res, pkgs);
});

export const getActivePackages = asyncHandler(async (req, res) => {
    const pkgs = await enquiryPackageService.getActivePackages();
    successResponse(res, pkgs);
});

export const updatePackage = asyncHandler(async (req, res) => {
    const pkg = await enquiryPackageService.updatePackage(req.params.id, req.body);
    successResponse(res, pkg, 'Package updated successfully');
});

export const deletePackage = asyncHandler(async (req, res) => {
    await enquiryPackageService.deletePackage(req.params.id);
    successResponse(res, null, 'Package deleted successfully');
});
