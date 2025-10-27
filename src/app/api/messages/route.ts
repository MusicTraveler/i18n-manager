import { NextResponse } from "next/server";
import { createConnection } from "@/db";


/**
 * Export all i18n messages grouped by locale
 * 
 * @example
 * curl http://localhost:4077/api/messages > all-messages.json
 * curl http://localhost:4077/api/messages/en.json > en.json
 */
export async function GET() {
  try {
    const db = createConnection();

    // Export all messages grouped by locale using the translation_key_paths view
    const allMessages = await db
      .selectFrom("translations")
      .innerJoin("translation_key_paths", "translations.key_id", "translation_key_paths.id")
      .select([
        "translation_key_paths.full_path as keyPath",
        "translations.language_code as languageCode",
        "translations.value",
      ])
      .execute();

    const groupedByLocale: Record<string, Record<string, unknown>> = {};

    for (const row of allMessages) {
      if (!row.keyPath) continue;

      if (!groupedByLocale[row.languageCode]) {
        groupedByLocale[row.languageCode] = {};
      }

      // Build full key path and transform to nested objects
      const keys = row.keyPath.split(".");
      let current = groupedByLocale[row.languageCode];

      // Navigate/create nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        // If the value at this key is not an object, we have a conflict (a string was set first)
        // This shouldn't happen if keys are properly structured, but handle it gracefully
        if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      // Set the final value
      current[keys[keys.length - 1]] = row.value;
    }

    return NextResponse.json(groupedByLocale, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
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
