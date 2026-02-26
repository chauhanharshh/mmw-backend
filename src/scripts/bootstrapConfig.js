/**
 * bootstrapConfig.js
 * Run once to seed default platform configuration values in MongoDB.
 * Idempotent: uses upsert so it can be run multiple times safely.
 *
 * Usage: node --experimental-vm-modules backend/src/scripts/bootstrapConfig.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PlatformConfig from '../models/PlatformConfig.js';

dotenv.config({ path: 'backend/.env' });

const DEFAULTS = [
    { key: 'primaryColor', value: '#1e3a8a', category: 'theme', description: 'Primary brand color (hex)' },
    { key: 'secondaryColor', value: '#fbbf24', category: 'theme', description: 'Secondary accent color (hex)' },
    { key: 'darkMode', value: false, category: 'feature', description: 'Enable dark mode globally' },
    { key: 'logoUrl', value: '', category: 'theme', description: 'URL to platform logo image' },
    { key: 'faviconUrl', value: '', category: 'theme', description: 'URL to platform favicon' },
    { key: 'platformName', value: 'MapsMyWay', category: 'content', description: 'Platform display name' },
    { key: 'homepageBannerTitle', value: 'Book Your Helicopter Now', category: 'content', description: 'Hero banner headline' },
    { key: 'homepageBannerSubtitle', value: 'Fast, scenic, premium air travel', category: 'content', description: 'Hero banner sub-headline' },
    { key: 'supportEmail', value: 'support@mapsmyway.com', category: 'content', description: 'Support contact email' },
];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const cfg of DEFAULTS) {
        await PlatformConfig.findOneAndUpdate(
            { key: cfg.key },
            { $setOnInsert: cfg },
            { upsert: true, new: true }
        );
        console.log(`  ✓ ${cfg.key}`);
    }

    console.log('Bootstrap complete.');
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
