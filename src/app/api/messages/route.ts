import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { translations, translationKeys } from "@/db/schema";
import { getDb } from "@/db";

// Helper function to build full key path from a key ID by traversing parents
async function getFullKeyPath(keyId: number): Promise<string> {
  const drizzleDb = getDb();
  const parts: string[] = [];
  let currentId: number | null = keyId;

  while (currentId !== null) {
    const keyRecord = await drizzleDb
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.id, currentId))
      .limit(1);

    if (keyRecord.length === 0) break;

    parts.unshift(keyRecord[0].key);
    currentId = keyRecord[0].parentId;
  }

  return parts.join(".");
}

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
          keyId: translations.keyId,
          value: translations.value,
        })
        .from(translations)
        .where(eq(translations.languageCode, locale));

      // Build full key paths and transform to nested objects
      const jsonObject: any = {};
      for (const row of result) {
        const keyPath = await getFullKeyPath(row.keyId);
        const keys = keyPath.split(".");
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
        keyId: translations.keyId,
        languageCode: translations.languageCode,
        value: translations.value,
      })
      .from(translations);

    const groupedByLocale: Record<string, any> = {};
    
    for (const row of allMessages) {
      if (!groupedByLocale[row.languageCode]) {
        groupedByLocale[row.languageCode] = {};
      }
      
      // Build full key path and transform to nested objects
      const keyPath = await getFullKeyPath(row.keyId);
      const keys = keyPath.split(".");
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

