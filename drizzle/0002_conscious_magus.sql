-- Custom SQL migration file, put your code below! --

CREATE VIEW IF NOT EXISTS translation_key_paths AS
WITH RECURSIVE key_tree AS (
    SELECT 
    id,
    parent_id,
    key,
    key as full_path,
    0 as depth
    FROM translation_keys
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT 
    tk.id,
    tk.parent_id,
    tk.key,
    kt.full_path || '.' || tk.key as full_path,
    kt.depth + 1
    FROM translation_keys tk
    INNER JOIN key_tree kt ON tk.parent_id = kt.id
    WHERE kt.depth < 20
)
SELECT id, full_path FROM key_tree;