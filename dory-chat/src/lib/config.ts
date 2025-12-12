/**
 * Configuration for message lifetime (TTL)
 * Can be configured via environment variables:
 * - MESSAGE_TTL_MS: Message lifetime in milliseconds (server-side, default: 60000 = 60 seconds)
 * - NEXT_PUBLIC_MESSAGE_TTL_MS: Message lifetime in milliseconds (client-side, default: 60000 = 60 seconds)
 * 
 * Special values:
 * - TTL <= 0: Messages will never expire and will persist indefinitely
 * 
 * Note: For consistency, it's recommended to set both variables to the same value.
 * If only one is set, the server will use MESSAGE_TTL_MS and the client will use NEXT_PUBLIC_MESSAGE_TTL_MS.
 */

// Helper to safely parse environment variable with default
// Preserves zero and negative values (they have special meaning - no expiration)
const parseEnvInt = (envVar: string | undefined, defaultValue: number): number => {
    if (!envVar) return defaultValue;
    const parsed = parseInt(envVar, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Server-side TTL (for API routes)
// Uses MESSAGE_TTL_MS or falls back to NEXT_PUBLIC_MESSAGE_TTL_MS if available
// If TTL <= 0, messages will never expire
export const MESSAGE_TTL_MS = process.env.MESSAGE_TTL_MS !== undefined
    ? parseEnvInt(process.env.MESSAGE_TTL_MS, 60 * 1000)
    : (process.env.NEXT_PUBLIC_MESSAGE_TTL_MS !== undefined
        ? parseEnvInt(process.env.NEXT_PUBLIC_MESSAGE_TTL_MS, 60 * 1000)
        : 60 * 1000); // Default: 60 seconds

// Client-side TTL (exposed to browser)
// In Next.js, NEXT_PUBLIC_ variables are available in both server and client contexts
// This ensures consistency between server and client
// If TTL <= 0, messages will never fade out
export const CLIENT_MESSAGE_TTL_MS = process.env.NEXT_PUBLIC_MESSAGE_TTL_MS !== undefined
    ? parseEnvInt(process.env.NEXT_PUBLIC_MESSAGE_TTL_MS, MESSAGE_TTL_MS)
    : MESSAGE_TTL_MS; // Fallback to server value if not set

// Fade start time (when messages start fading out)
// Only calculated if TTL > 0, otherwise set to a very large value to prevent fading
export const MESSAGE_FADE_START_MS = MESSAGE_TTL_MS > 0 ? MESSAGE_TTL_MS - 1000 : Number.MAX_SAFE_INTEGER;
export const CLIENT_MESSAGE_FADE_START_MS = CLIENT_MESSAGE_TTL_MS > 0 ? CLIENT_MESSAGE_TTL_MS - 1000 : Number.MAX_SAFE_INTEGER;

