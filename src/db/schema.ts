import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Languages table - for reference data about supported languages
export const languages = sqliteTable("languages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // e.g., 'en', 'es', 'fr'
  name: text("name").notNull(), // e.g., 'English', 'Spanish', 'French'
});

// Namespaces table - for grouping translation keys
export const namespaces = sqliteTable("namespaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // e.g., 'feature', 'settings'
});

// Keys table - stores translation keys
export const translationKeys = sqliteTable("translation_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namespaceId: integer("namespace_id").references(() => namespaces.id), // Optional, references namespaces.id
  keyPath: text("key_path").notNull().unique(), // e.g., 'feature.section.label'
  description: text("description"), // Optional, for context or notes
});

// Translations table - stores the actual translations
export const translations = sqliteTable("translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyId: integer("key_id").notNull().references(() => translationKeys.id),
  languageCode: text("language_code").notNull().references(() => languages.code),
  value: text("value").notNull(), // The translated text
});

// Unique index to ensure one translation per key-language pair
export const uniqueKeyLanguageIndex = uniqueIndex("unique_key_language").on(translations.keyId, translations.languageCode);

// Relations for easier querying
export const languagesRelations = relations(languages, ({ many }) => ({
  translations: many(translations),
}));

export const namespacesRelations = relations(namespaces, ({ many }) => ({
  translationKeys: many(translationKeys),
}));

export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  namespace: one(namespaces, {
    fields: [translationKeys.namespaceId],
    references: [namespaces.id],
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
export type Namespace = typeof namespaces.$inferSelect;
export type NewNamespace = typeof namespaces.$inferInsert;
export type TranslationKey = typeof translationKeys.$inferSelect;
export type NewTranslationKey = typeof translationKeys.$inferInsert;
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

