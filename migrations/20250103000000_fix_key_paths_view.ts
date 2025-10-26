import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function up(db: Kysely<null>): Promise<void> {
  // Update the view to build paths correctly (parent + child)
  await sql`
    CREATE OR REPLACE VIEW translation_key_paths AS
    WITH RECURSIVE key_hierarchy AS (
      -- Base case: root keys (no parent)
      SELECT id, key, parent_id, CAST(key AS TEXT) as full_path
      FROM translation_keys
      WHERE parent_id IS NULL
      
      UNION ALL
      
      -- Recursive case: child keys - build path from parent to child
      SELECT k.id, k.key, k.parent_id, 
             CONCAT(kh.full_path, '.', k.key) as full_path
      FROM translation_keys k
      INNER JOIN key_hierarchy kh ON k.parent_id = kh.id
    )
    SELECT id, full_path
    FROM key_hierarchy;
  `.execute(db);
}

export async function down(db: Kysely<null>): Promise<void> {
  // Revert to old version
  await sql`
    CREATE OR REPLACE VIEW translation_key_paths AS
    WITH RECURSIVE key_hierarchy AS (
      SELECT id, key, parent_id, CAST(key AS TEXT) as full_path
      FROM translation_keys
      WHERE parent_id IS NULL
      
      UNION ALL
      
      SELECT k.id, k.key, k.parent_id, 
             CONCAT(k.key, '.', kh.full_path) as full_path
      FROM translation_keys k
      INNER JOIN key_hierarchy kh ON k.parent_id = kh.id
    )
    SELECT id, full_path
    FROM key_hierarchy;
  `.execute(db);
}

