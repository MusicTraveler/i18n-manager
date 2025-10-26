import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { messages } from "@/db/schema";

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

    // Get all unique keys across all locales
    const allMessages = await drizzleDb.select().from(messages).all();
    const allKeys = new Set(allMessages.map((m: any) => m.key));

    // Get keys for the specified locale
    const localeMessages = allMessages.filter((m: any) => m.locale === locale);
    const localeKeys = new Set(localeMessages.map((m: any) => m.key));

    // Find missing keys
    const missingKeys = Array.from(allKeys).filter((key) => !localeKeys.has(key));

    // Count translations per key
    const keyCounts: Record<string, number> = {};
    allMessages.forEach((m: any) => {
      keyCounts[m.key] = (keyCounts[m.key] || 0) + 1;
    });

    // Find all locales
    const allLocales = new Set(allMessages.map((m: any) => m.locale));

    return NextResponse.json({
      locale,
      missingKeys,
      missingCount: missingKeys.length,
      totalKeys: allKeys.size,
      completeKeys: localeKeys.size,
      completeness: allKeys.size > 0 ? ((localeKeys.size / allKeys.size) * 100).toFixed(2) + "%" : "0%",
      allLocales: Array.from(allLocales),
      keyCompleteness: Array.from(allKeys).map((key) => ({
        key,
        locales: allMessages.filter((m: any) => m.key === key).map((m: any) => m.locale),
        localeCount: (allMessages.filter((m: any) => m.key === key).length || 0),
      })),
    });
  } catch (error) {
    console.error("Error checking missing keys:", error);
    return NextResponse.json(
      { error: "Failed to check missing keys" },
      { status: 500 }
    );
  }
}

