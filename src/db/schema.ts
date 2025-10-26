import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Languages table - for reference data about supported languages
export const languages = sqliteTable("languages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // e.g., 'en', 'es', 'fr'
  name: text("name").notNull(), // e.g., 'English', 'Spanish', 'French'
});

// Keys table - self-referencing table for hierarchical translation keys
export const translationKeys = sqliteTable("translation_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): any => translationKeys.id), // Self-reference for hierarchy
  key: text("key").notNull(), // e.g., 'feature', 'label', 'title'
  description: text("description"), // Optional, for context or notes
});

// Translations table - stores the actual translations
export const translations = sqliteTable("translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyId: integer("key_id").notNull().references(() => translationKeys.id),
  languageCode: text("language_code").notNull().references(() => languages.code),
  value: text("value").notNull(), // The translated text
}, (table) => ({
  // Unique index to ensure one translation per key-language pair
  uniqueKeyLanguage: uniqueIndex("unique_key_language").on(table.keyId, table.languageCode),
}));

// Relations for easier querying
export const languagesRelations = relations(languages, ({ many }) => ({
  translations: many(translations),
}));

export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  parent: one(translationKeys, {
    fields: [translationKeys.parentId],
    references: [translationKeys.id],
    relationName: "keyHierarchy",
  }),
  children: many(translationKeys, {
    relationName: "keyHierarchy",
  }),
  translations: many(translations),
}));

export const translationsRelations = relations(translations, ({ one }) => ({
  translationKey: one(translationKeys, {
    fields: [translations.keyId],
    references: [translationKeys.id],
  }),
  language: one(languages, {
    fields: [translations.languageCode],
    references: [languages.code],
  }),
}));

// Type exports for convenience
export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;
export type TranslationKey = typeof translationKeys.$inferSelect;
export type NewTranslationKey = typeof translationKeys.$inferInsert;
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

