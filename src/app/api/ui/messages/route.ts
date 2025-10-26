import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { translations, translationKeys, languages } from "@/db/schema";
import { getDb } from "@/lib/db";

export interface Message {
  id?: number;
  key: string;
  locale: string;
  message: string;
}

export async function GET(request: Request) {
  try {
    const context = getCloudflareContext();
    const db = context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const drizzleDb = getDb(db);
    const url = new URL(request.url);
    const keyPath = url.searchParams.get("key");
    const locale = url.searchParams.get("locale");

    let result;
    if (keyPath && locale) {
      result = await drizzleDb
        .select({
          id: translations.id,
          key: translationKeys.keyPath,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .where(and(eq(translationKeys.keyPath, keyPath), eq(translations.languageCode, locale)))
        .orderBy(translationKeys.keyPath, translations.languageCode);
    } else if (keyPath) {
      result = await drizzleDb
        .select({
          id: translations.id,
          key: translationKeys.keyPath,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .where(eq(translationKeys.keyPath, keyPath))
        .orderBy(translations.languageCode);
    } else if (locale) {
      result = await drizzleDb
        .select({
          id: translations.id,
          key: translationKeys.keyPath,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .where(eq(translations.languageCode, locale))
        .orderBy(translationKeys.keyPath);
    } else {
      result = await drizzleDb
        .select({
          id: translations.id,
          key: translationKeys.keyPath,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .orderBy(translationKeys.keyPath, translations.languageCode);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = getCloudflareContext();
    const db = context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const drizzleDb = getDb(db);
    const body = await request.json() as { key: string; locale: string; message: string };
    const { key, locale, message } = body;

    if (!key || !locale || !message) {
      return NextResponse.json(
        { error: "key, locale, and message are required" },
        { status: 400 }
      );
    }

    // Find or create the translation key
    let keyRecord = await drizzleDb
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.keyPath, key))
      .limit(1);

    let keyId;
    if (keyRecord.length > 0) {
      keyId = keyRecord[0].id;
    } else {
      const newKey = await drizzleDb
        .insert(translationKeys)
        .values({ keyPath: key })
        .returning();
      keyId = newKey[0].id;
    }

    // Find or create the language
    let languageRecord = await drizzleDb
      .select()
      .from(languages)
      .where(eq(languages.code, locale))
      .limit(1);

    if (languageRecord.length === 0) {
      await drizzleDb
        .insert(languages)
        .values({ code: locale, name: locale });
    }

    // Create the translation
    const result = await drizzleDb
      .insert(translations)
      .values({ keyId, languageCode: locale, value: message })
      .returning();

    const translationWithKey = await drizzleDb
      .select({
        id: translations.id,
        key: translationKeys.keyPath,
        locale: translations.languageCode,
        message: translations.value,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .where(eq(translations.id, result[0].id))
      .limit(1);

    return NextResponse.json(translationWithKey[0]);
  } catch (error: any) {
    console.error("Error creating message:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "Message with this key and locale already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const context = getCloudflareContext();
    const db = context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const drizzleDb = getDb(db);
    const body = await request.json() as { id: number; key: string; locale: string; message: string };
    const { id, key, locale, message } = body;

    if (!id || !key || !locale || !message) {
      return NextResponse.json(
        { error: "id, key, locale, and message are required" },
        { status: 400 }
      );
    }

    // Update the translation value
    await drizzleDb
      .update(translations)
      .set({ value: message })
      .where(eq(translations.id, id));

    // Return the updated translation with joined data
    const result = await drizzleDb
      .select({
        id: translations.id,
        key: translationKeys.keyPath,
        locale: translations.languageCode,
        message: translations.value,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .where(eq(translations.id, id))
      .limit(1);

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = getCloudflareContext();
    const db = context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const drizzleDb = getDb(db);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await drizzleDb
      .delete(translations)
      .where(eq(translations.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

