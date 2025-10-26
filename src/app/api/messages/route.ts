import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { translations, translationKeys } from "@/db/schema";
import { getDb } from "@/db";

/**
 * Export i18n messages as JSON files
 * 
 * @example
 * curl http://localhost:3000/api/messages?locale=en > en.json
 * curl http://localhost:3000/api/messages > all-messages.json
 */
export async function GET(request: Request) {
  try {

    const drizzleDb = getDb();
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale");

    // Export as JSON for a specific locale
    if (locale) {
      const result = await drizzleDb
        .select({
          keyPath: translationKeys.keyPath,
          value: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .where(eq(translations.languageCode, locale))
        .orderBy(translationKeys.keyPath);

      // Transform flat keys to nested objects
      const jsonObject: any = {};
      for (const row of result) {
        const keys = row.keyPath.split(".");
        let current = jsonObject;
        
        // Navigate/create nested structure
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }
        
        // Set the final value
        current[keys[keys.length - 1]] = row.value;
      }

      return NextResponse.json(jsonObject, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${locale}.json"`,
        },
      });
    }

    // Export all messages grouped by locale
    const allMessages = await drizzleDb
      .select({
        keyPath: translationKeys.keyPath,
        languageCode: translations.languageCode,
        value: translations.value,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .orderBy(translations.languageCode, translationKeys.keyPath);

    const groupedByLocale: Record<string, any> = {};
    
    for (const row of allMessages) {
      if (!groupedByLocale[row.languageCode]) {
        groupedByLocale[row.languageCode] = {};
      }
      
      // Transform flat keys to nested objects
      const keys = row.keyPath.split(".");
      let current = groupedByLocale[row.languageCode];
      
      // Navigate/create nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      
      // Set the final value
      current[keys[keys.length - 1]] = row.value;
    }

    return NextResponse.json(groupedByLocale, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=all-messages.json",
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

