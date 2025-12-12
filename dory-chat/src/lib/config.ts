/**
 * Configuration for message lifetime (TTL)
 * Can be configured via environment variable:
 * - NEXT_PUBLIC_MESSAGE_TTL_MS: Message lifetime in milliseconds (default: 60000 = 60 seconds)
 * 
 * Special values:
 * - TTL <= 0: Messages will never expire and will persist indefinitely
 * 
 * Note: NEXT_PUBLIC_ prefix is required for Next.js to expose the variable to both server and client code.
 */

// Helper to safely parse environment variable with default
// Preserves zero and negative values (they have special meaning - no expiration)
const parseEnvInt = (envVar: string | undefined, defaultValue: number): number => {
    if (!envVar) return defaultValue;
    const parsed = parseInt(envVar, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Message TTL (used in both server and client)
// In Next.js, NEXT_PUBLIC_ variables are available in both server and client contexts
// If TTL <= 0, messages will never expire
export const MESSAGE_TTL_MS = parseEnvInt(
    process.env.NEXT_PUBLIC_MESSAGE_TTL_MS,
    60 * 1000 // Default: 60 seconds
);

// Alias for client-side usage (same value)
export const CLIENT_MESSAGE_TTL_MS = MESSAGE_TTL_MS;

// Fade start time (when messages start fading out)
// Only calculated if TTL > 0, otherwise set to a very large value to prevent fading
export const MESSAGE_FADE_START_MS = MESSAGE_TTL_MS > 0 ? MESSAGE_TTL_MS - 1000 : Number.MAX_SAFE_INTEGER;
export const CLIENT_MESSAGE_FADE_START_MS = MESSAGE_FADE_START_MS;

