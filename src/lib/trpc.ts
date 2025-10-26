import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { translations, translationKeys, languages } from "@/db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";

type Context = {
  db: DrizzleD1Database<typeof schema>;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Helper function to build full key path from a key ID by traversing parents
async function getFullKeyPath(db: DrizzleD1Database<typeof schema>, keyId: number): Promise<string> {
  try {
    const parts: string[] = [];
    let currentId: number | null = keyId;
    const visited = new Set<number>(); // Prevent infinite loops

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      
      const keyRecord = await db
        .select()
        .from(translationKeys)
        .where(eq(translationKeys.id, currentId))
        .limit(1);

      if (keyRecord.length === 0) break;

      parts.unshift(keyRecord[0].key);
      currentId = keyRecord[0].parentId;
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
  db: DrizzleD1Database<typeof schema>,
  keyPath: string
): Promise<number> {
  const parts = keyPath.split(".");
  let parentId: number | null = null;

  for (const part of parts) {
    // Try to find existing key with this name and parent
    const existing = await db
      .select()
      .from(translationKeys)
      .where(
        parentId === null
          ? and(eq(translationKeys.key, part), isNull(translationKeys.parentId))
          : and(eq(translationKeys.key, part), eq(translationKeys.parentId, parentId))
      )
      .limit(1);

    if (existing.length > 0) {
      parentId = existing[0].id;
    } else {
      // Create new key
      await db
        .insert(translationKeys)
        .values({ key: part, parentId });
      
      // Get the newly created key
      const newKey = await db
        .select()
        .from(translationKeys)
        .where(
          parentId === null
            ? and(eq(translationKeys.key, part), isNull(translationKeys.parentId))
            : and(eq(translationKeys.key, part), eq(translationKeys.parentId, parentId))
        )
        .limit(1);
      
      if (newKey.length > 0) {
        parentId = newKey[0].id;
      }
    }
  }

  return parentId!;
}

// Helper function to find a key ID from a dot-separated path
async function findKeyIdFromPath(
  db: DrizzleD1Database<typeof schema>,
  keyPath: string
): Promise<number | null> {
  const parts = keyPath.split(".");
  let parentId: number | null = null;

  for (const part of parts) {
    const existing = await db
      .select()
      .from(translationKeys)
      .where(
        parentId === null
          ? and(eq(translationKeys.key, part), isNull(translationKeys.parentId))
          : and(eq(translationKeys.key, part), eq(translationKeys.parentId, parentId))
      )
      .limit(1);

    if (existing.length === 0) return null;
    parentId = existing[0].id;
  }

  return parentId;
}

export const appRouter = router({
  // Get all available languages
  getLanguages: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        code: languages.code,
        name: languages.name,
      })
      .from(languages)
      .orderBy(languages.code);
    
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
      const drizzleDb = ctx.db;
      const { code, name } = input;

      // Check if language already exists
      const existing = await drizzleDb
        .select()
        .from(languages)
        .where(eq(languages.code, code))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Language with this code already exists");
      }

      await drizzleDb
        .insert(languages)
        .values({ code, name });

      return { success: true };
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
      const drizzleDb = ctx.db;
      const { key, locale } = input;

      // Get translations with optional locale filter
      const translationsQuery = drizzleDb
        .select({
          id: translations.id,
          keyId: translations.keyId,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations);

      const allTranslations = locale
        ? await translationsQuery.where(eq(translations.languageCode, locale))
        : await translationsQuery;

      // Get unique key IDs
      const uniqueKeyIds = new Set(allTranslations.map((t) => t.keyId));
      
      if (uniqueKeyIds.size === 0) {
        return [];
      }
      
      // Use raw SQL to get all key paths efficiently
      // This bypasses the parameter limit by using a subquery
      const keyPaths: Array<{ id: number; full_path: string }> = await drizzleDb.all(
        sql`SELECT id, full_path FROM translation_key_paths WHERE id IN (SELECT DISTINCT key_id FROM translations)`
      );
      
      // Create a map of keyId -> full path
      const keysMap = new Map(keyPaths.map(k => [k.id, k.full_path]));

      // Build full key paths for each translation
      const result = allTranslations.map((t) => ({
        id: t.id,
        key: keysMap.get(t.keyId) || `unknown.${t.keyId}`,
        locale: t.locale,
        message: t.message,
      }));

      // Filter by key if specified
      const filteredResult = key
        ? result.filter((r) => r.key === key)
        : result;

      // Sort by key then locale
      filteredResult.sort((a, b) => {
        const keyCompare = a.key.localeCompare(b.key);
        if (keyCompare !== 0) return keyCompare;
        return a.locale.localeCompare(b.locale);
      });

      return filteredResult;
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
      const drizzleDb = ctx.db;
      const { key, locale, message } = input;

      // Find or create the translation key hierarchy
      const keyId = await findOrCreateKeyFromPath(drizzleDb, key);

      // Find or create the language
      const languageRecord = await drizzleDb
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

      return {
        id: result[0].id,
        key: await getFullKeyPath(drizzleDb, keyId),
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
      const drizzleDb = ctx.db;
      const { locale, messages, overwriteExisting } = input;

      if (messages.length === 0) {
        return { successCount: 0, errorCount: 0, inserted: 0, updated: 0 };
      }

      // Ensure language exists
      const languageRecord = await drizzleDb
        .select()
        .from(languages)
        .where(eq(languages.code, locale))
        .limit(1);

      if (languageRecord.length === 0) {
        await drizzleDb
          .insert(languages)
          .values({ code: locale, name: locale })
          .onConflictDoUpdate({ target: languages.code, set: { name: locale } });
      }

      // Step 1: Find or create all translation key hierarchies
      const uniqueKeys = Array.from(new Set(messages.map((m) => m.key)));
      const keyMap = new Map<string, number>();
      
      for (const keyPath of uniqueKeys) {
        const keyId = await findOrCreateKeyFromPath(drizzleDb, keyPath);
        keyMap.set(keyPath, keyId);
      }

      // Step 2: Upsert or insert translations one by one
      for (const msg of messages) {
        const keyId = keyMap.get(msg.key);
        if (!keyId) throw new Error(`Key ${msg.key} not found`);
        
        if (overwriteExisting) {
          // Update existing translations
          await drizzleDb
            .insert(translations)
            .values({
              keyId,
              languageCode: locale,
              value: msg.message,
            })
            .onConflictDoUpdate({
              target: [translations.keyId, translations.languageCode],
              set: { value: sql`excluded.value` }
            });
        } else {
          // Skip existing translations, only insert new ones
          try {
            await drizzleDb
              .insert(translations)
              .values({
                keyId,
                languageCode: locale,
                value: msg.message,
              });
          } catch {
            // Ignore conflict errors - translation already exists
          }
        }
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
      const drizzleDb = ctx.db;
      const { id, message } = input;

      // Update the translation value
      await drizzleDb
        .update(translations)
        .set({ value: message })
        .where(eq(translations.id, id));

      // Return the updated translation with joined data
      const result = await drizzleDb
        .select({
          id: translations.id,
          keyId: translations.keyId,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .where(eq(translations.id, id))
        .limit(1);

      const translation = result[0];
      return {
        id: translation.id,
        key: await getFullKeyPath(drizzleDb, translation.keyId),
        locale: translation.locale,
        message: translation.message,
      };
    }),

  // Delete a message
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const drizzleDb = ctx.db;
      const { id } = input;

      await drizzleDb
        .delete(translations)
        .where(eq(translations.id, id));

      return { success: true };
    }),

  // Delete all translations for a specific key (across all languages)
  deleteByKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const drizzleDb = ctx.db;
      const { key } = input;

      // Find the translation key by path
      const keyId = await findKeyIdFromPath(drizzleDb, key);

      if (!keyId) {
        return { success: false, message: "Key not found" };
      }

      // Delete all translations for this key
      await drizzleDb
        .delete(translations)
        .where(eq(translations.keyId, keyId));

      // Delete the translation key itself (and any orphaned parent keys)
      await drizzleDb
        .delete(translationKeys)
        .where(eq(translationKeys.id, keyId));

      return { success: true };
    }),

  // Get missing keys for a locale
  getMissingKeys: publicProcedure
    .input(z.object({ locale: z.string() }))
    .query(async ({ input, ctx }) => {
      const drizzleDb = ctx.db;
      const { locale } = input;

      // Get all leaf translation keys (keys that have translations, not just parent nodes)
      const allTranslationsRaw = await drizzleDb
        .select({
          keyId: translations.keyId,
          languageCode: translations.languageCode,
        })
        .from(translations);

      // Get unique key IDs
      const uniqueKeyIds = Array.from(new Set(allTranslationsRaw.map((t) => t.keyId)));

      // Build full paths for all unique keys
      const allKeyPathsMap = new Map<number, string>();
      for (const keyId of uniqueKeyIds) {
        const fullPath = await getFullKeyPath(drizzleDb, keyId);
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
});

export type AppRouter = typeof appRouter;

