/**
 * Admin Bootstrap Script
 *
 * Ensures the admin account exists in both Firebase Auth and MongoDB.
 * Called once per server startup after the database is connected.
 *
 * - If the admin already exists → no-op (idempotent)
 * - If ADMIN_PASSWORD is not set → skip with a warn
 * - Creates the Firebase Auth user if missing, then the MongoDB User record
 */

import admin from '../config/firebase.js';
import User from '../models/User.js';
import { adminConfig } from '../config/admin.js';
import logger from '../utils/logger.js';

export async function bootstrapAdmin() {
    if (!adminConfig.password) {
        logger.warn('[Bootstrap] ADMIN_PASSWORD not set — skipping admin bootstrap');
        return;
    }

    try {
        // 1. Check if admin already exists in MongoDB
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            logger.info('[Bootstrap] Admin user already exists', { email: existingAdmin.email });
            return;
        }

        logger.info('[Bootstrap] No admin found — creating admin account...');

        // 2. Find or create Firebase Auth user
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(adminConfig.email);
            logger.info('[Bootstrap] Firebase admin user already exists');
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                firebaseUser = await admin.auth().createUser({
                    email: adminConfig.email,
                    password: adminConfig.password,
                    displayName: adminConfig.name,
                    emailVerified: true
                });
                logger.info('[Bootstrap] Created Firebase admin user', { uid: firebaseUser.uid });
            } else {
                throw err;
            }
        }

        // 3. Set custom claim so Firebase token also carries role
        await admin.auth().setCustomUserClaims(firebaseUser.uid, { role: 'admin' });

        // 4. Create MongoDB User record
        await User.create({
            firebaseUid: firebaseUser.uid,
            email: adminConfig.email,
            name: adminConfig.name,
            role: 'admin',
            status: 'active',
            verified: true
        });

        logger.info('[Bootstrap] Admin account created successfully', { email: adminConfig.email });
    } catch (err) {
        // Bootstrap failures should not crash the server — log and continue
        logger.error('[Bootstrap] Failed to bootstrap admin account', {
            error: err.message,
            code: err.code
        });
    }
}
