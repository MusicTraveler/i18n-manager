import type { Kysely } from 'kysely';

export async function up(db: Kysely<null>): Promise<void> {
  // Create languages table
  await db.schema
    .createTable('languages')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('code', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .execute();

  // Create translation_keys table
  await db.schema
    .createTable('translation_keys')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('parent_id', 'integer', (col) => col.references('translation_keys.id').onDelete('cascade'))
    .addColumn('key', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .execute();

  // Create translations table
  await db.schema
    .createTable('translations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('key_id', 'integer', (col) => col.references('translation_keys.id').onDelete('cascade').notNull())
    .addColumn('language_code', 'varchar(255)', (col) => col.references('languages.code').onDelete('cascade').notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .execute();

  // Create unique index to ensure one translation per key-language pair
  await db.schema
    .createIndex('unique_key_language')
    .on('translations')
    .columns(['key_id', 'language_code'])
    .unique()
    .execute();

  // Create index on translation_keys for parent_id lookups
  await db.schema
    .createIndex('idx_translation_keys_parent_id')
    .on('translation_keys')
    .column('parent_id')
    .execute();

  // Create index on translation_keys for key lookups
  await db.schema
    .createIndex('idx_translation_keys_key')
    .on('translation_keys')
    .column('key')
    .execute();

  // Create index on translations for language_code lookups
  await db.schema
    .createIndex('idx_translations_language_code')
    .on('translations')
    .column('language_code')
    .execute();
}

export async function down(db: Kysely<null>): Promise<void> {
  // Drop in reverse order
  await db.schema.dropTable('translations').execute();
  await db.schema.dropTable('translation_keys').execute();
  await db.schema.dropTable('languages').execute();
}


