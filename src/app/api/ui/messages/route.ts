import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { messages } from "@/db/schema";
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
    const key = url.searchParams.get("key");
    const locale = url.searchParams.get("locale");

    let result;
    if (key && locale) {
      result = await drizzleDb
        .select()
        .from(messages)
        .where(and(eq(messages.key, key), eq(messages.locale, locale)))
        .orderBy(messages.key, messages.locale);
    } else if (key) {
      result = await drizzleDb
        .select()
        .from(messages)
        .where(eq(messages.key, key))
        .orderBy(messages.locale);
    } else if (locale) {
      result = await drizzleDb
        .select()
        .from(messages)
        .where(eq(messages.locale, locale))
        .orderBy(messages.key);
    } else {
      result = await drizzleDb
        .select()
        .from(messages)
        .orderBy(messages.key, messages.locale);
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

    const result = await drizzleDb
      .insert(messages)
      .values({ key, locale, message })
      .returning();

    return NextResponse.json(result[0]);
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

    const result = await drizzleDb
      .update(messages)
      .set({ key, locale, message, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();

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
      .delete(messages)
      .where(eq(messages.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

