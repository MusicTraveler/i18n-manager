import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { messages } from "@/db/schema";
import { getDb } from "@/lib/db";

/**
 * Export i18n messages as JSON files
 * 
 * @example
 * curl http://localhost:3000/api/messages?locale=en > en.json
 * curl http://localhost:3000/api/messages > all-messages.json
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

    // Export as JSON for a specific locale
    if (locale) {
      const result = await drizzleDb
        .select()
        .from(messages)
        .where(eq(messages.locale, locale))
        .orderBy(messages.key);

      // Transform flat keys to nested objects
      const jsonObject: any = {};
      for (const row of result) {
        const keys = row.key.split(".");
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
        current[keys[keys.length - 1]] = row.message;
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
      .select()
      .from(messages)
      .orderBy(messages.locale, messages.key);

    const groupedByLocale: Record<string, any> = {};
    
    for (const row of allMessages) {
      if (!groupedByLocale[row.locale]) {
        groupedByLocale[row.locale] = {};
      }
      
      // Transform flat keys to nested objects
      const keys = row.key.split(".");
      let current = groupedByLocale[row.locale];
      
      // Navigate/create nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      
      // Set the final value
      current[keys[keys.length - 1]] = row.message;
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

