/**
 * Centralized version configuration for CofreAdmin app.
 *
 * TO UPDATE APP VERSION:
 * Update the APP_VERSION constant below (e.g., 'v1.0.4-b', 'v1.1.0', 'v2.0.0').
 * Reflected automatically across:
 * 1. Home Screen (Header badge next to app title)
 * 2. Login Screen / Secure Access (top header badge)
 * 3. Server API (/api/version), package.json, and package-lock.json
 */
export const APP_VERSION = 'v1.0.5-b';
export const APP_VERSION_STATUS = 'Ready';
export const APP_VERSION_LABEL = `${APP_VERSION} ${APP_VERSION_STATUS}`;