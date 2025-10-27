import { NextResponse } from "next/server";
import { createConnection } from "@/db";

/**
 * Export i18n messages as JSON files
 *
 * @example
 * curl http://localhost:4077/api/messages/en.json > en.json
 * curl http://localhost:4077/api/messages/es.json > es.json
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ locale: string[] }> }
) {
    try {
        const db = createConnection();
        const { locale } = await params;

        // Join the locale array (which might include parts like ["en", "json"])
        // and remove .json extension if present
        const localePath = locale.join("/");
        const localeCode = localePath.replace(/\.json$/, "");

        // Check if the language exists
        const languageExists = await db
            .selectFrom("languages")
            .select("code")
            .where("code", "=", localeCode)
            .executeTakeFirst();

        if (!languageExists) {
            return NextResponse.json(
                { error: `Language code "${localeCode}" not found` },
                { status: 404 }
            );
        }

        // Use the translation_key_paths view to get full paths in one query
        const result = await db
            .selectFrom("translations")
            .innerJoin("translation_key_paths", "translations.key_id", "translation_key_paths.id")
            .select([
                "translation_key_paths.full_path as keyPath",
                "translations.value",
            ])
            .where("language_code", "=", localeCode)
            .execute();

        // Build full key paths and transform to nested objects
        const jsonObject: Record<string, unknown> = {};
        for (const row of result) {
            if (!row.keyPath) continue;

            const keys = row.keyPath.split(".");
            let current = jsonObject;

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

        return NextResponse.json(jsonObject, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch messages",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

