import React, { useState } from "react";
import { Collapse, Button, Checkbox } from "@blueprintjs/core";
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
  selectedKeys: Set<string>;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  onEdit: (message: Message) => void;
  onAddRow?: (parentKey: string) => void;
  onRowSelect: (fullKey: string, isSelected: boolean) => void;
  onSelectAll: () => void;
}

export function CategorySection({ 
  category, 
  subcategories, 
  allLocales, 
  selectedKeys,
  selectAllChecked,
  selectAllIndeterminate,
  onEdit, 
  onAddRow,
  onRowSelect,
  onSelectAll
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const totalKeys = Array.from(subcategories.values()).flat().length;

  const handleAddCategoryRow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddRow) {
      onAddRow(category);
    }
  };

  const handleAddSubcategoryRow = (subcategory: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddRow) {
      const parentKey = subcategory === "_root" ? category : `${category}.${subcategory}`;
      onAddRow(parentKey);
    }
  };

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
        <div className={styles.categoryHeaderActions}>
          <Button
            small
            icon="add"
            intent="none"
            minimal
            onClick={handleAddCategoryRow}
            title="Add key to this category"
          />
        </div>
      </div>

      <Collapse isOpen={isExpanded} keepChildrenMounted>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                {/* Checkbox Column */}
                <th className={styles.checkboxHeader}>
                  <Checkbox
                    checked={selectAllChecked}
                    indeterminate={selectAllIndeterminate}
                    onChange={onSelectAll}
                  />
                </th>
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
              </tr>
            </thead>
            <tbody>
              {Array.from(subcategories.entries()).map(([subcategory, rows]) => {
                if (rows.length === 0) return null;

                return (
                  <React.Fragment key={`category-${category}-subcategory-${subcategory}`}>
                    {subcategory !== "_root" && (
                      <tr className={styles.subcategoryRow}>
                        <td className={styles.checkboxCell} />
                        <td className={styles.frozenLeftCell} />
                        <td
                          colSpan={allLocales.length}
                          className={styles.subcategoryCell}
                        >
                          <span>{subcategory}</span>
                          <div className={styles.subcategoryActions}>
                            <Button
                              small
                              icon="add"
                              minimal
                              onClick={(e: React.MouseEvent) => handleAddSubcategoryRow(subcategory, e)}
                              title="Add key to this subsection"
                            />
                          </div>
                        </td>
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
                        isSelected={selectedKeys.has(row.fullKey)}
                        onSelect={onRowSelect}
                      />
                    ))}
                    <tr className={styles.addRowRow}>
                      <td className={styles.checkboxCell} />
                      <td className={styles.frozenLeftCell} />
                      <td
                        colSpan={allLocales.length}
                        className={styles.addRowCell}
                      >
                        <Button
                          small
                          icon="add"
                          intent="primary"
                          minimal
                          onClick={(e: React.MouseEvent) => handleAddSubcategoryRow(subcategory, e)}
                          text="Add new translation"
                        />
                      </td>
                    </tr>
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

