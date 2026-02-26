/**
 * Operator Status Migration Script
 *
 * Migrates Operator documents:
 *   - status: 'approved' → status: 'active'
 *
 * Also syncs User.isOperatorApproved and User.status
 * for all operators that are now 'active'.
 *
 * Safe to re-run (idempotent).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Operator from '../models/Operator.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌  MONGO_URI not set in .env');
    process.exit(1);
}

async function migrate() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // 1. Rename 'approved' → 'active'
    const approvedResult = await Operator.updateMany(
        { status: 'approved' },
        { $set: { status: 'active' } }
    );
    console.log(`🔄  Renamed 'approved' → 'active': ${approvedResult.modifiedCount} operator(s)`);

    // 2. For all active operators, sync User.isOperatorApproved = true
    const activeOperators = await Operator.find({ status: 'active' }).lean();
    let synced = 0;
    for (const op of activeOperators) {
        const result = await User.updateOne(
            { _id: op.user },
            { $set: { isOperatorApproved: true, status: 'active' } }
        );
        if (result.modifiedCount > 0) synced++;
    }
    console.log(`✅  Synced User.isOperatorApproved for ${synced} active operator(s)`);

    console.log('\n── Migration Summary ────────────────');
    console.log(`  Operator docs migrated: ${approvedResult.modifiedCount}`);
    console.log(`  User docs synced:       ${synced}`);
    console.log('─────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('✅  Done.');
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
