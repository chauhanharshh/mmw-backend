import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import { LOCATIONS, LOCATION_GROUPS } from '../config/locations.js';

/**
 * GET /api/locations
 * Returns all valid Char Dham helicopter helipad locations.
 * Public endpoint — no authentication required.
 */
export const getLocations = asyncHandler(async (req, res) => {
    return successResponse(res, {
        locations: LOCATIONS,
        groups: LOCATION_GROUPS
    }, null);
});
