import { NextResponse } from "next/server";
import { createConnection } from "@/db";

// Helper function to build full key path from a key ID by traversing parents
async function getFullKeyPath(keyId: number, db: ReturnType<typeof createConnection>): Promise<string> {
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
 * curl http://localhost:4077/api/messages/en.json > en.json
 * curl http://localhost:4077/api/messages/es.json > es.json
 */
export async function GET(
    request: Request,
    context?: { params?: Promise<{ locale: string }> }
) {
    try {
        const params = context?.params;
        console.log("Request URL:", request.url);
        console.log("Context:", context);
        console.log("Params:", params);

        if (!params) {
            return NextResponse.json({ error: "Invalid route - params not provided" }, { status: 400 });
        }

        const db = createConnection();
        const { locale } = await params;

        // Remove .json extension if present
        const localeCode = locale.replace(/\.json$/, "");

        const result = await db
            .selectFrom("translations")
            .select(["translations.key_id as keyId", "translations.value"])
            .where("language_code", "=", localeCode)
            .execute();

        // Build full key paths and transform to nested objects
        const jsonObject: Record<string, unknown> = {};
        for (const row of result) {
            const keyPath = await getFullKeyPath(row.keyId, db);
            const keys = keyPath.split(".");
            let current = jsonObject;

            // Navigate/create nested structure
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key]) {
                    current[key] = {};
                }
                current = current[key] as Record<string, unknown>;
            }

            // Set the final value
            current[keys[keys.length - 1]] = row.value;
        }

        return NextResponse.json(jsonObject, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="${localeCode}.json"; filename*=UTF-8''${localeCode}.json`,
            },
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

