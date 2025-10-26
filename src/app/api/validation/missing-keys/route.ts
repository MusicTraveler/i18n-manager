import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { translationKeys, translations, languages } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check for missing keys in a specific locale compared to all keys
 */
export async function GET(request: Request) {
  try {
    const context = getCloudflareContext();
    const db = context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const drizzleDb = getDb(db);
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale");

    if (!locale) {
      return NextResponse.json({ error: "locale parameter is required" }, { status: 400 });
    }

    // Get all translation keys
    const allKeys = await drizzleDb.select().from(translationKeys).all();
    const allKeysMap = new Map(allKeys.map((k) => [k.id, k.keyPath]));
    const allKeyPaths = new Set(allKeys.map((k) => k.keyPath));

    // Get all translations with their keys and languages
    const allTranslations = await drizzleDb
      .select({
        keyId: translations.keyId,
        languageCode: translations.languageCode,
        keyPath: translationKeys.keyPath,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id));

    // Get all unique locales (language codes)
    const allLocales = new Set(allTranslations.map((t) => t.languageCode));

    // Get translations for the specified locale
    const localeTranslations = allTranslations.filter((t) => t.languageCode === locale);
    const localeKeys = new Set(localeTranslations.map((t) => t.keyPath));

    // Find missing keys for the specified locale
    const missingKeys = Array.from(allKeyPaths).filter((keyPath) => !localeKeys.has(keyPath));

    // Build key completeness data
    const keyCompletenessData = Array.from(allKeyPaths).map((keyPath) => {
      const translationsForKey = allTranslations.filter((t) => t.keyPath === keyPath);
      return {
        key: keyPath,
        locales: Array.from(new Set(translationsForKey.map((t) => t.languageCode))),
        localeCount: translationsForKey.length,
      };
    });

    return NextResponse.json({
      locale,
      missingKeys,
      missingCount: missingKeys.length,
      totalKeys: allKeyPaths.size,
      completeKeys: localeKeys.size,
      completeness: allKeyPaths.size > 0 
        ? ((localeKeys.size / allKeyPaths.size) * 100).toFixed(2) + "%" 
        : "0%",
      allLocales: Array.from(allLocales),
      keyCompleteness: keyCompletenessData,
    });
  } catch (error) {
    console.error("Error checking missing keys:", error);
    return NextResponse.json(
      { error: "Failed to check missing keys" },
      { status: 500 }
    );
  }
}

