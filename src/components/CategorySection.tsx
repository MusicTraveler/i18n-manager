import React, { useState } from "react";
import { Collapse } from "@blueprintjs/core";
import { MessageKeyRow } from "./MessageKeyRow";
import type { Message } from "@/lib/client";

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
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          padding: "12px",
          background: "#364552",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderRadius: "4px",
          userSelect: "none",
          marginBottom: "10px",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
          {isExpanded ? "▼" : "▶"}
        </span>
        <span style={{ color: "white", fontWeight: "bold", fontSize: "16px", textTransform: "capitalize" }}>
          {category}
        </span>
        <span style={{ color: "#A7B6C2", fontSize: "14px" }}>
          ({totalKeys} key{totalKeys !== 1 ? 's' : ''})
        </span>
      </div>

      <Collapse isOpen={isExpanded}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#2b3d52", borderRadius: "4px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #8f99a3" }}>
                <th style={{ padding: "12px", textAlign: "left", color: "white", fontWeight: "bold", width: "250px" }}>
                  Key
                </th>
                {allLocales.map((locale) => (
                  <th
                    key={locale}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: "white",
                      fontWeight: "bold",
                      width: "250px",
                    }}
                  >
                    {locale.toUpperCase()}
                  </th>
                ))}
                <th style={{ padding: "12px", textAlign: "left", color: "white", fontWeight: "bold", width: "100px" }}>
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
                      <tr style={{ borderBottom: "2px solid #405364" }}>
                        <td
                          colSpan={allLocales.length + 2}
                          style={{
                            padding: "10px 15px",
                            background: "#364552",
                            color: "#A7B6C2",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            fontSize: "12px",
                          }}
                        >
                          {subcategory}
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

