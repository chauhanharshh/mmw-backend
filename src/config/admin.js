/**
 * Admin Credential Configuration
 *
 * Reads admin credentials from environment variables.
 * Set these in backend/.env before first startup:
 *
 *   ADMIN_EMAIL=admin@mapsmyway.com
 *   ADMIN_PASSWORD=YourStrongPassword123!
 *   ADMIN_NAME=Super Admin
 */

export const adminConfig = {
    email: process.env.ADMIN_EMAIL || 'admin@mapsmyway.com',
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Super Admin'
};

if (!adminConfig.password) {
    console.warn(
        '[WARN] ADMIN_PASSWORD is not set in .env. ' +
        'Admin bootstrap will be skipped. ' +
        'Please set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in backend/.env.'
    );
}
