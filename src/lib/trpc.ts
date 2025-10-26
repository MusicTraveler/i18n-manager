import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { translations, translationKeys, languages } from "@/db/schema";
import { getDbDirect } from "@/db/index";

const t = initTRPC.context<{}>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  // Get all messages with optional filters
  list: publicProcedure
    .input(
      z.object({
        key: z.string().optional(),
        locale: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const drizzleDb = getDbDirect();
      const { key, locale } = input;

      let result;
      if (key && locale) {
        result = await drizzleDb
          .select({
            id: translations.id,
            key: translationKeys.keyPath,
            locale: translations.languageCode,
            message: translations.value,
          })
          .from(translations)
          .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
          .where(and(eq(translationKeys.keyPath, key), eq(translations.languageCode, locale)))
          .orderBy(translationKeys.keyPath, translations.languageCode);
      } else if (key) {
        result = await drizzleDb
          .select({
            id: translations.id,
            key: translationKeys.keyPath,
            locale: translations.languageCode,
            message: translations.value,
          })
          .from(translations)
          .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
          .where(eq(translationKeys.keyPath, key))
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

      return result;
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
    .mutation(async ({ input }) => {
      const drizzleDb = getDbDirect();
      const { key, locale, message } = input;

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

      return translationWithKey[0];
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
    .mutation(async ({ input }) => {
      const drizzleDb = getDbDirect();
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
          key: translationKeys.keyPath,
          locale: translations.languageCode,
          message: translations.value,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
        .where(eq(translations.id, id))
        .limit(1);

      return result[0];
    }),

  // Delete a message
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const drizzleDb = getDbDirect();
      const { id } = input;

      await drizzleDb
        .delete(translations)
        .where(eq(translations.id, id));

      return { success: true };
    }),

  // Get missing keys for a locale
  getMissingKeys: publicProcedure
    .input(z.object({ locale: z.string() }))
    .query(async ({ input }) => {
      const drizzleDb = getDbDirect();
      const { locale } = input;

      // Get all translation keys
      const allKeys = await drizzleDb.select().from(translationKeys).all();
      const allKeysMap = new Map(allKeys.map((k) => [k.id, k.keyPath]));
      const allKeyPaths = new Set(allKeys.map((k) => k.keyPath));

      // Get all translations with their keys and languages
      const allTranslations = await drizzleDb
        .select({
          keyId: translations.keyId,
          languageCode: translations.languageCode,
          keyPath: translationKeys.keyPath,
        })
        .from(translations)
        .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id));

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

