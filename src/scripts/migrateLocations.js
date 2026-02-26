/**
 * Char Dham Route Migration Script
 *
 * Migrates existing Route documents that may have free-text location strings
 * (e.g. "Dehradun", "Kedarnath") to the canonical location codes
 * used by the new dropdown system.
 *
 * Usage:
 *   node src/scripts/migrateLocations.js
 *
 * Run from the backend directory. Can be run multiple times safely (idempotent).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Route from '../models/Route.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌  MONGO_URI not set in .env');
    process.exit(1);
}

/**
 * Maps known free-text location names (case-insensitive) to their canonical codes.
 * Extend this map if your DB contains other legacy spellings.
 */
const MIGRATION_MAP = {
    // Dehradun variants
    'dehradun': 'DEHRA',
    'sahastradhara': 'DEHRA',
    'sahastradhara helipad': 'DEHRA',
    'dehradun (sahastradhara helipad)': 'DEHRA',

    // Phata variants
    'phata': 'PHATA',
    'phata helipad': 'PHATA',

    // Guptkashi variants
    'guptkashi': 'GUPTKASHI',
    'guptakashi': 'GUPTKASHI',
    'guptkashi helipad': 'GUPTKASHI',

    // Sersi variants
    'sersi': 'SERSI',
    'sersi helipad': 'SERSI',

    // Kedarnath variants
    'kedarnath': 'KEDAR',
    'kedarnath helipad': 'KEDAR',

    // Badrinath variants
    'badrinath': 'BADRI',
    'badrinath helipad': 'BADRI',

    // Joshimath variants
    'joshimath': 'JOSHI',
    'joshimath helipad': 'JOSHI',

    // Govindghat variants
    'govindghat': 'GOVIND',
    'govindghat helipad': 'GOVIND',

    // Yamunotri variants
    'yamunotri': 'YAMUNO',
    'kharsali': 'YAMUNO',
    'yamunotri (kharsali helipad)': 'YAMUNO',

    // Harsil / Gangotri variants
    'harsil': 'HARSIL',
    'gangotri': 'HARSIL',
    'harsil helipad': 'HARSIL',
    'harsil helipad (gangotri route)': 'HARSIL',
};

/** Canonical codes — already migrated, leave unchanged */
const VALID_CODES = new Set(Object.values(MIGRATION_MAP));

function resolveCode(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (VALID_CODES.has(trimmed)) return trimmed; // already a code
    return MIGRATION_MAP[trimmed.toLowerCase()] || null;
}

async function migrate() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    const routes = await Route.find({}).lean();
    console.log(`📊  Found ${routes.length} route document(s) to inspect`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const route of routes) {
        const newFrom = resolveCode(route.from);
        const newTo = resolveCode(route.to);

        const fromChanged = newFrom && newFrom !== route.from;
        const toChanged = newTo && newTo !== route.to;

        if (!fromChanged && !toChanged) {
            skipped++;
            continue;
        }

        if (!newFrom || !newTo) {
            console.warn(
                `⚠️   Route ${route._id}: could not map from="${route.from}" to="${route.to}" — skipping (manual fix needed)`
            );
            failed++;
            continue;
        }

        await Route.updateOne(
            { _id: route._id },
            { $set: { from: newFrom, to: newTo } }
        );

        console.log(
            `🔄  Route ${route._id}: "${route.from}" → "${newFrom}", "${route.to}" → "${newTo}"`
        );
        updated++;
    }

    console.log('\n── Migration Summary ──────────────────');
    console.log(`  Updated : ${updated}`);
    console.log(`  Already OK: ${skipped}`);
    console.log(`  Needs manual fix: ${failed}`);
    console.log('────────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('✅  Done.');
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
