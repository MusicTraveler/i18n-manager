import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { Kysely } from "kysely";
import type { DB } from "@/db/types";
import { libreTranslate } from "@/lib/libretranslate-client";

type Context = {
  db: Kysely<DB>;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Helper function to build full key path from a key ID by traversing parents
async function getFullKeyPath(db: Kysely<DB>, keyId: number): Promise<string> {
  try {
    const parts: string[] = [];
    let currentId: number | null = keyId;
    const visited = new Set<number>(); // Prevent infinite loops

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      
      const keyRecord = await db
        .selectFrom("translation_keys")
        .selectAll()
        .where("id", "=", currentId)
        .executeTakeFirst();

      if (!keyRecord) break;

      parts.unshift(keyRecord.key);
      currentId = keyRecord.parent_id;
    }

    const path = parts.join(".");
    return path || `unknown.key.${keyId}`;
  } catch (error) {
    console.error(`Error building key path for keyId ${keyId}:`, error);
    return `error.key.${keyId}`;
  }
}

// Helper function to find or create a key from a dot-separated path (e.g., "feature.section.label")
async function findOrCreateKeyFromPath(
  db: Kysely<DB>,
  keyPath: string
): Promise<number> {
  const parts = keyPath.split(".");
  let parentId: number | null = null;

  for (const part of parts) {
    // Try to find existing key with this name and parent
    const existing = (parentId === null
      ? await db
          .selectFrom("translation_keys")
          .selectAll()
          .where("key", "=", part)
          .where("parent_id", "is", null)
          .executeTakeFirst()
      : await db
          .selectFrom("translation_keys")
          .selectAll()
          .where("key", "=", part)
          .where("parent_id", "=", parentId)
          .executeTakeFirst()) as { id: number; parent_id: number | null; key: string; description: string | null } | undefined;

    if (existing) {
      parentId = existing.id;
    } else {
      // Create new key
      const result = await db
        .insertInto("translation_keys")
        .values({ key: part, parent_id: parentId })
        .returningAll()
        .executeTakeFirst();
      
      if (result) {
        parentId = result.id;
      }
    }
  }

  if (!parentId) throw new Error('Failed to create key');
  return parentId;
}

// Helper function to find a key ID from a dot-separated path
async function findKeyIdFromPath(
  db: Kysely<DB>,
  keyPath: string
): Promise<number | null> {
  const parts = keyPath.split(".");
  let parentId: number | null = null;

  for (const part of parts) {
    const existing = (parentId === null
      ? await db
          .selectFrom("translation_keys")
          .selectAll()
          .where("key", "=", part)
          .where("parent_id", "is", null)
          .executeTakeFirst()
      : await db
          .selectFrom("translation_keys")
          .selectAll()
          .where("key", "=", part)
          .where("parent_id", "=", parentId)
          .executeTakeFirst()) as { id: number; parent_id: number | null; key: string; description: string | null } | undefined;

    if (!existing) return null;
    parentId = existing.id;
  }

  return parentId;
}

export const appRouter = router({
  // Get all available languages
  getLanguages: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .selectFrom("languages")
      .select(["code", "name"])
      .orderBy("code")
      .execute();
    
    return result;
  }),

  // Create a new language
  createLanguage: publicProcedure
    .input(
      z.object({
        code: z.string().min(2).max(2),
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { code, name } = input;

      // Check if language already exists
      const existing = await db
        .selectFrom("languages")
        .selectAll()
        .where("code", "=", code)
        .executeTakeFirst();

      if (existing) {
        throw new Error("Language with this code already exists");
      }

      await db
        .insertInto("languages")
        .values({ code, name })
        .execute();

      return { success: true };
    }),

  // Get all key paths from translation_keys table
  getAllKeys: publicProcedure
    .query(async ({ ctx }) => {
      const db = ctx.db;
      
      const allKeys = await db
        .selectFrom("translation_key_paths")
        .select(["id", "full_path as key"])
        .execute();
      
      return allKeys.map(k => k.key).filter((k): k is string => k !== null && k !== undefined);
    }),

  // Get all messages with optional filters
  list: publicProcedure
    .input(
      z.object({
        key: z.string().optional(),
        locale: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db;
      const { key, locale } = input;

      // Build query using the translation_key_paths view
      let query = db
        .selectFrom("translations as t")
        .innerJoin("translation_key_paths as kp", "t.key_id", "kp.id")
        .select([
          "t.id",
          "t.key_id as keyId",
          "t.language_code as locale",
          "t.value as message",
          "kp.full_path as key"
        ]);

      if (locale) {
        query = query.where("t.language_code", "=", locale);
      }

      const result = await query.execute();

      // Filter by key if specified
      const filteredResult = key
        ? result.filter((r) => r.key === key)
        : result;

      // Sort by key then locale
      filteredResult.sort((a, b) => {
        const keyCompare = (a.key || '').localeCompare(b.key || '');
        if (keyCompare !== 0) return keyCompare;
        return a.locale.localeCompare(b.locale);
      });

      return filteredResult.map((t) => ({
        id: t.id,
        key: t.key || `unknown.${t.keyId}`,
        locale: t.locale,
        message: t.message,
      }));
    }),

  // Create a new message
  create: publicProcedure
    .input(
      z.object({
        key: z.string(),
        locale: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { key, locale, message } = input;

      // Find or create the translation key hierarchy
      const keyId = await findOrCreateKeyFromPath(db, key);

      // Find or create the language
      const languageRecord = await db
        .selectFrom("languages")
        .selectAll()
        .where("code", "=", locale)
        .executeTakeFirst();

      if (!languageRecord) {
        await db
          .insertInto("languages")
          .values({ code: locale, name: locale })
          .execute();
      }

      // Create the translation
      const result = await db
        .insertInto("translations")
        .values({ 
          key_id: keyId, 
          language_code: locale, 
          value: message 
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: result.id,
        key: await getFullKeyPath(db, keyId),
        locale,
        message,
      };
    }),

  // Bulk import messages (upsert)
  bulkImport: publicProcedure
    .input(
      z.object({
        locale: z.string(),
        messages: z.array(
          z.object({
            key: z.string(),
            message: z.string(),
          })
        ),
        overwriteExisting: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { locale, messages, overwriteExisting } = input;

      if (messages.length === 0) {
        return { successCount: 0, errorCount: 0, inserted: 0, updated: 0 };
      }

      // Ensure language exists
      const languageRecord = await db
        .selectFrom("languages")
        .selectAll()
        .where("code", "=", locale)
        .executeTakeFirst();

      if (!languageRecord) {
        await db
          .insertInto("languages")
          .values({ code: locale, name: locale })
          .onConflict((oc) => oc
            .column("code")
            .doUpdateSet({ name: locale })
          )
          .execute();
      }

      // Step 1: Find or create all translation key hierarchies
      const uniqueKeys = Array.from(new Set(messages.map((m) => m.key)));
      const keyMap = new Map<string, number>();
      
      for (const keyPath of uniqueKeys) {
        const keyId = await findOrCreateKeyFromPath(db, keyPath);
        keyMap.set(keyPath, keyId);
      }

      // Step 2: Batch insert/upsert translations
      const translationValues = messages.map((msg) => {
        const keyId = keyMap.get(msg.key);
        if (!keyId) throw new Error(`Key ${msg.key} not found`);
        return {
          key_id: keyId,
          language_code: locale,
          value: msg.message,
        };
      });

      // Batch insert all translations
      if (overwriteExisting && translationValues.length > 0) {
        // Use ON CONFLICT to upsert
        await db
          .insertInto("translations")
          .values(translationValues)
          .onConflict((oc) => oc
            .columns(["key_id", "language_code"])
            .doUpdateSet((eb) => ({ value: eb.ref("excluded.value") }))
          )
          .execute();
      } else if (translationValues.length > 0) {
        // Try to insert, but skip conflicts
        await db
          .insertInto("translations")
          .values(translationValues)
          .onConflict((oc) => oc
            .columns(["key_id", "language_code"])
            .doNothing()
          )
          .execute();
      }

      return {
        successCount: messages.length,
        errorCount: 0,
        inserted: messages.length,
        updated: 0,
      };
    }),

  // Update a message
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        key: z.string(),
        locale: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { id, message } = input;

      // Update the translation value
      await db
        .updateTable("translations")
        .set({ value: message })
        .where("id", "=", id)
        .execute();

      // Return the updated translation with joined data
      const translation = await db
        .selectFrom("translations")
        .select([
          "translations.id",
          "translations.key_id as keyId",
          "translations.language_code as locale",
          "translations.value as message",
        ])
        .where("id", "=", id)
        .executeTakeFirstOrThrow();

      return {
        id: translation.id,
        key: await getFullKeyPath(db, translation.keyId),
        locale: translation.locale,
        message: translation.message,
      };
    }),

  // Delete a message
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { id } = input;

      await db
        .deleteFrom("translations")
        .where("id", "=", id)
        .execute();

      return { success: true };
    }),

  // Delete all translations for a specific key (across all languages)
  deleteByKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db;
      const { key } = input;

      // Find the translation key by path
      const keyId = await findKeyIdFromPath(db, key);

      if (!keyId) {
        return { success: false, message: "Key not found" };
      }

      // Recursively get all descendant key IDs
      const getAllDescendantKeyIds = async (parentId: number): Promise<number[]> => {
        const children = await db
          .selectFrom("translation_keys")
          .select("id")
          .where("parent_id", "=", parentId)
          .execute();

        const descendantIds = [parentId];
        for (const child of children) {
          const childDescendants = await getAllDescendantKeyIds(child.id);
          descendantIds.push(...childDescendants);
        }

        return descendantIds;
      };

      const allKeyIds = await getAllDescendantKeyIds(keyId);

      // Delete all translations for all descendant keys
      await db
        .deleteFrom("translations")
        .where("key_id", "in", allKeyIds)
        .execute();

      // Delete all descendant translation keys
      await db
        .deleteFrom("translation_keys")
        .where("id", "in", allKeyIds)
        .execute();

      return { success: true };
    }),

  // Get missing keys for a locale
  getMissingKeys: publicProcedure
    .input(z.object({ locale: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = ctx.db;
      const { locale } = input;

      // Get all leaf translation keys (keys that have translations, not just parent nodes)
      const allTranslationsRaw = await db
        .selectFrom("translations")
        .select([
          "translations.key_id as keyId",
          "translations.language_code as languageCode",
        ])
        .execute();

      // Get unique key IDs
      const uniqueKeyIds = Array.from(new Set(allTranslationsRaw.map((t) => t.keyId)));

      // Build full paths for all unique keys
      const allKeyPathsMap = new Map<number, string>();
      for (const keyId of uniqueKeyIds) {
        const fullPath = await getFullKeyPath(db, keyId);
        allKeyPathsMap.set(keyId, fullPath);
      }

      const allKeyPaths = new Set(allKeyPathsMap.values());

      // Get all translations with their built key paths
      const allTranslations = allTranslationsRaw.map((t) => ({
        keyId: t.keyId,
        languageCode: t.languageCode,
        keyPath: allKeyPathsMap.get(t.keyId) || "",
      }));

      // Get all unique locales (language codes)
      const allLocales = new Set(allTranslations.map((t) => t.languageCode));

      // Get translations for the specified locale
      const localeTranslations = allTranslations.filter((t) => t.languageCode === locale);
      const localeKeys = new Set(localeTranslations.map((t) => t.keyPath));

      // Find missing keys for the specified locale
      const missingKeys = Array.from(allKeyPaths).filter((keyPath) => !localeKeys.has(keyPath));

      // Build key completeness data
      const keyCompletenessData = Array.from(allKeyPaths).map((keyPath) => {
        const translationsForKey = allTranslations.filter((t) => t.keyPath === keyPath);
        return {
          key: keyPath,
          locales: Array.from(new Set(translationsForKey.map((t) => t.languageCode))),
          localeCount: translationsForKey.length,
        };
      });

      return {
        locale,
        missingKeys,
        missingCount: missingKeys.length,
        totalKeys: allKeyPaths.size,
        completeKeys: localeKeys.size,
        completeness: allKeyPaths.size > 0 
          ? ((localeKeys.size / allKeyPaths.size) * 100).toFixed(2) + "%" 
          : "0%",
        allLocales: Array.from(allLocales),
        keyCompleteness: keyCompletenessData,
      };
    }),

  // Translate text using LibreTranslate
  translateText: publicProcedure
    .input(
      z.object({
        text: z.union([z.string(), z.array(z.string())]),
        target: z.string(),
        source: z.string().optional().default("en"),
        format: z.enum(["text", "html"]).optional().default("text"),
      })
    )
    .mutation(async ({ input }) => {
      const { text, target, source, format } = input;

      try {
        const result = await libreTranslate.translate.postTranslate({
          q: text,
          source,
          target,
          format,
        });

        return result;
      } catch (error) {
        console.error("Translation error:", error);
        throw new Error("Failed to translate text");
      }
    }),
});

export type AppRouter = typeof appRouter;
