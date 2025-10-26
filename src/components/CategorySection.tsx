import React, { useState } from "react";
import { Collapse } from "@blueprintjs/core";
import { MessageKeyRow } from "./MessageKeyRow";
import type { Message } from "@/lib/client";
import styles from "./CategorySection.module.css";

interface KeyRow {
  fullKey: string;
  category: string;
  subcategory?: string;
  keyName: string;
  messagesByLocale: Map<string, Message>;
  missingLocales: string[];
}

interface CategorySectionProps {
  category: string;
  subcategories: Map<string, KeyRow[]>;
  allLocales: string[];
  onEdit: (message: Message) => void;
  onDelete: (fullKey: string) => void;
}

export function CategorySection({ category, subcategories, allLocales, onEdit, onDelete }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const totalKeys = Array.from(subcategories.values()).flat().length;

  return (
    <div className={styles.container}>
      {/* biome-ignore lint/a11y/useSemanticElements: Using div for expanded styling */}
      <div
        className={styles.categoryHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className={styles.categoryExpandIcon}>
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className={styles.categoryTitle}>
          {category}
        </span>
        <span className={styles.categoryCount}>
          ({totalKeys} key{totalKeys !== 1 ? 's' : ''})
        </span>
      </div>

      <Collapse isOpen={isExpanded}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                {/* Frozen Key Column */}
                <th className={styles.frozenKeyHeader}>
                  Key
                </th>
                {/* Scrollable Locale Columns */}
                {allLocales.map((locale) => (
                  <th
                    key={locale}
                    className={styles.tableHead}
                  >
                    {locale.toUpperCase()}
                  </th>
                ))}
                {/* Frozen Actions Column */}
                <th className={styles.frozenActionsHeader}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(subcategories.entries()).map(([subcategory, rows]) => {
                if (rows.length === 0) return null;

                return (
                  <React.Fragment key={`category-${category}-subcategory-${subcategory}`}>
                    {subcategory !== "_root" && (
                      <tr className={styles.subcategoryRow}>
                        <td className={styles.frozenLeftCell} />
                        <td
                          colSpan={allLocales.length}
                          className={styles.subcategoryCell}
                        >
                          {subcategory}
                        </td>
                        <td className={styles.frozenRightCell} />
                      </tr>
                    )}
                    {rows.map((row) => (
                      <MessageKeyRow
                        key={row.fullKey}
                        fullKey={row.fullKey}
                        category={row.category}
                        subcategory={row.subcategory}
                        keyName={row.keyName}
                        messagesByLocale={row.messagesByLocale}
                        missingLocales={row.missingLocales}
                        allLocales={allLocales}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapse>
    </div>
  );
}

