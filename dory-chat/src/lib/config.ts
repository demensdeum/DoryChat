/**
 * Configuration for message and room lifetime (TTL) and cooldowns
 * Can be configured via environment variables:
 * - NEXT_PUBLIC_MESSAGE_TTL_MS: Message lifetime in milliseconds (default: 60000 = 60 seconds)
 * - NEXT_PUBLIC_ROOM_TTL_MS: Room lifetime in milliseconds (default: 0 = rooms never expire)
 * - NEXT_PUBLIC_ENDPOINT_CREATION_COOLDOWN_SECONDS: Endpoint creation cooldown in seconds (default: 10 seconds)
 * - NEXT_PUBLIC_MESSAGE_SEND_COOLDOWN_SECONDS: Message send cooldown in seconds (default: 2 seconds)
 * 
 * Special values:
 * - TTL <= 0: Messages/rooms will never expire and will persist indefinitely
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

// Room TTL (used in server-side API routes)
// If TTL <= 0, rooms will never expire
export const ROOM_TTL_MS = parseEnvInt(
    process.env.NEXT_PUBLIC_ROOM_TTL_MS,
    0 // Default: rooms never expire
);

// Endpoint creation cooldown (used in client-side)
// Cooldown period in seconds before creating another endpoint
export const ENDPOINT_CREATION_COOLDOWN_SECONDS = parseEnvInt(
    process.env.NEXT_PUBLIC_ENDPOINT_CREATION_COOLDOWN_SECONDS,
    10 // Default: 10 seconds
);

// Message send cooldown (used in client-side)
// Cooldown period in seconds before sending another message
export const MESSAGE_SEND_COOLDOWN_SECONDS = parseEnvInt(
    process.env.NEXT_PUBLIC_MESSAGE_SEND_COOLDOWN_SECONDS,
    2 // Default: 2 seconds
);

