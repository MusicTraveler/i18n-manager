/**
 * LibreTranslate API Client
 * 
 * Automatically configured client for the LibreTranslate API.
 * The base URL is set from environment variables.
 * 
 * Usage:
 * ```ts
 * import { libreTranslate } from '@/lib/libretranslate-client';
 * 
 * // Translate text
 * const result = await libreTranslate.translate.translate({
 *   q: 'Hello world',
 *   source: 'en',
 *   target: 'es'
 * });
 * 
 * // Get languages
 * const languages = await libreTranslate.frontend.languages();
 * ```
 */

import { LibreTranslateClient, OpenAPI } from "./libretranslate";

// Get base URL from environment
const getBaseUrl = () => {
  return (
    process.env.LIBRETRANSLATE_URL ||
    process.env.NEXT_PUBLIC_LIBRETRANSLATE_URL ||
    "https://libre-translate-production.up.railway.app"
  );
};

// Get API key from environment
const getApiKey = () => {
  return (
    process.env.LIBRETRANSLATE_API_KEY ||
    process.env.NEXT_PUBLIC_LIBRETRANSLATE_API_KEY
  );
};

// Configure the OpenAPI client
OpenAPI.BASE = getBaseUrl();

// Create and export the client instance
const apiKey = getApiKey();
export const libreTranslate = new LibreTranslateClient({
  BASE: getBaseUrl(),
  HEADERS: apiKey ? { "api_key": apiKey } : undefined,
});

// Re-export types and services for convenience
export type { languages, translate, detections, frontend_settings } from "./libretranslate";

// Export the client class for custom instances
export { LibreTranslateClient } from "./libretranslate";

/**
 * Create a custom LibreTranslate client with custom configuration
 */
export function createLibreTranslateClient(config?: Parameters<typeof LibreTranslateClient.prototype.constructor>[0]) {
  return new LibreTranslateClient(config);
}

