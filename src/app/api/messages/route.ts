import { NextResponse } from "next/server";
import { getDb } from "@/db";

// Helper function to build full key path from a key ID by traversing parents
async function getFullKeyPath(keyId: number): Promise<string> {
  const db = getDb();
  const parts: string[] = [];
  let currentId: number | null = keyId;

  while (currentId !== null) {
    const keyRecord = await db
      .selectFrom("translation_keys")
      .selectAll()
      .where("id", "=", currentId)
      .executeTakeFirst();

    if (!keyRecord) break;

    parts.unshift(keyRecord.key);
    currentId = keyRecord.parent_id;
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
    const db = getDb();
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale");

    // Export as JSON for a specific locale
    if (locale) {
      const result = await db
        .selectFrom("translations")
        .select([
          "translations.key_id as keyId",
          "translations.value",
        ])
        .where("language_code", "=", locale)
        .execute();

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
    const allMessages = await db
      .selectFrom("translations")
      .select([
        "translations.key_id as keyId",
        "translations.language_code as languageCode",
        "translations.value",
      ])
      .execute();

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
