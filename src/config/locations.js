/**
 * Char Dham Yatra – Canonical Helipad Locations
 *
 * This is the single source of truth for all valid helicopter hubs
 * and landing points on the platform. Both the backend (for validation)
 * and the frontend (via /api/locations) consume this data.
 *
 * Adding a new location: add an entry here; validation everywhere updates automatically.
 */
export const LOCATIONS = [
    // ── Dehradun ──────────────────────────────────────────────────────────────
    {
        code: 'DEHRA',
        name: 'Dehradun (Sahastradhara Helipad)',
        region: 'Dehradun'
    },

    // ── Kedarnath Sector ──────────────────────────────────────────────────────
    {
        code: 'PHATA',
        name: 'Phata Helipad',
        region: 'Kedarnath Sector'
    },
    {
        code: 'GUPTKASHI',
        name: 'Guptkashi Helipad',
        region: 'Kedarnath Sector'
    },
    {
        code: 'SERSI',
        name: 'Sersi Helipad',
        region: 'Kedarnath Sector'
    },
    {
        code: 'KEDAR',
        name: 'Kedarnath Helipad',
        region: 'Kedarnath Sector'
    },

    // ── Badrinath Sector ──────────────────────────────────────────────────────
    {
        code: 'BADRI',
        name: 'Badrinath Helipad',
        region: 'Badrinath Sector'
    },
    {
        code: 'JOSHI',
        name: 'Joshimath Helipad',
        region: 'Badrinath Sector'
    },
    {
        code: 'GOVIND',
        name: 'Govindghat Helipad',
        region: 'Badrinath Sector'
    },

    // ── Yamunotri Sector ──────────────────────────────────────────────────────
    {
        code: 'YAMUNO',
        name: 'Yamunotri (Kharsali Helipad)',
        region: 'Yamunotri Sector'
    },

    // ── Gangotri Sector ───────────────────────────────────────────────────────
    {
        code: 'HARSIL',
        name: 'Harsil Helipad (Gangotri route)',
        region: 'Gangotri Sector'
    }
];

/** Set of valid location codes for O(1) validation */
export const VALID_LOCATION_CODES = new Set(LOCATIONS.map((l) => l.code));

/** Map from code to full location object */
export const LOCATION_BY_CODE = Object.fromEntries(LOCATIONS.map((l) => [l.code, l]));

/** Locations grouped by region */
export const LOCATION_GROUPS = LOCATIONS.reduce((acc, loc) => {
    if (!acc[loc.region]) acc[loc.region] = [];
    acc[loc.region].push(loc);
    return acc;
}, {});
